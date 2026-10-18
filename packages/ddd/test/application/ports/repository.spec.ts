import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  AggregateFinder,
  AggregateRemover,
  AggregateSaver,
} from '../../../src/application/ports/repository';
import { UseCase } from '../../../src/application/use-case/use-case';
import { AggregateRoot, IdType, Required, StringType } from '../../../src/domain/index';
import { AggregateNotFoundException } from '../../../src/exceptions/index';
import type { PrimitiveTypes } from '../../../src/domain/index';

class CustomerId extends IdType {}
class CustomerName extends Required(StringType) {}

class Customer extends AggregateRoot<CustomerId> {
  constructor(
    id: CustomerId,
    readonly name: CustomerName,
  ) {
    super(id);
  }

  toPrimitives(): PrimitiveTypes<Customer> {
    return { id: this.id.value, name: this.name.value };
  }

  static fromPrimitives(row: PrimitiveTypes<Customer>): Customer {
    return new Customer(new CustomerId(row.id), new CustomerName(row.name));
  }
}

class KeyValueCustomerRepository
  implements AggregateFinder<Customer>, AggregateSaver<Customer>, AggregateRemover<Customer>
{
  readonly store = new Map<string, string>();

  async findById(id: CustomerId): Promise<Customer | null> {
    const row = this.store.get(id.value);
    return row === undefined ? null : Customer.fromPrimitives(JSON.parse(row));
  }

  async save(customer: Customer): Promise<void> {
    this.store.set(customer.id.value, JSON.stringify(customer.toPrimitives()));
  }

  async delete(id: CustomerId): Promise<void> {
    this.store.delete(id.value);
  }
}

const customerId = '0f8c2b6e-3c1a-4c55-9a4e-0d6c1b2f7a10';

describe('Repository roles: the ports a use case loads, saves and deletes aggregates through', () => {
  it('is typed by the aggregate and its id type', () => {
    expectTypeOf<AggregateFinder<Customer>['findById']>().toEqualTypeOf<
      (id: CustomerId) => Promise<Customer | null>
    >();
    expectTypeOf<AggregateSaver<Customer>['save']>().toEqualTypeOf<
      (aggregate: Customer) => Promise<void>
    >();
    expectTypeOf<AggregateRemover<Customer>['delete']>().toEqualTypeOf<
      (id: CustomerId) => Promise<void>
    >();
  });

  it('a key-value adapter saves a new customer and loads it back', async () => {
    const repository = new KeyValueCustomerRepository();
    await repository.save(new Customer(new CustomerId(customerId), new CustomerName('Ana')));
    const loaded = await repository.findById(new CustomerId(customerId));
    expect(loaded?.toPrimitives()).toEqual({ id: customerId, name: 'Ana' });
  });

  it('returns null for a customer that was never saved', async () => {
    expect(await new KeyValueCustomerRepository().findById(new CustomerId(customerId))).toBeNull();
  });

  it('forgets a deleted customer', async () => {
    const repository = new KeyValueCustomerRepository();
    await repository.save(new Customer(new CustomerId(customerId), new CustomerName('Ana')));
    await repository.delete(new CustomerId(customerId));
    expect(await repository.findById(new CustomerId(customerId))).toBeNull();
  });

  it('refuses an id of another type', async () => {
    const repository: AggregateFinder<Customer> = new KeyValueCustomerRepository();
    // @ts-expect-error the repository looks customers up by CustomerId, not by raw text
    expect(await repository.findById(customerId)).toBeNull();
  });

  describe('interface segregation: each use case asks only for the role it uses', () => {
    class RegisterCustomer extends UseCase<{ id: string; name: string }, void> {
      constructor(private readonly customers: AggregateSaver<Customer>) {
        super();
      }

      protected async handle(input: { id: string; name: string }): Promise<void> {
        await this.customers.save(
          new Customer(new CustomerId(input.id), new CustomerName(input.name)),
        );
      }
    }

    class GetCustomerName extends UseCase<{ id: string }, string> {
      constructor(private readonly customers: AggregateFinder<Customer>) {
        super();
      }

      protected async handle(input: { id: string }): Promise<string> {
        const customer = await this.customers.findById(new CustomerId(input.id));
        if (customer === null) {
          throw new AggregateNotFoundException('Customer', input.id);
        }
        return customer.name.value;
      }
    }

    class ForgetCustomer extends UseCase<{ id: string }, void> {
      constructor(private readonly customers: AggregateRemover<Customer>) {
        super();
      }

      protected async handle(input: { id: string }): Promise<void> {
        await this.customers.delete(new CustomerId(input.id));
      }
    }

    it('a sign-up only needs to save, so a test double implements just save', async () => {
      const saved: string[] = [];
      const saver: AggregateSaver<Customer> = {
        save: async (customer) => {
          saved.push(customer.name.value);
        },
      };
      await new RegisterCustomer(saver).execute({ id: customerId, name: 'Ana' });
      expect(saved).toEqual(['Ana']);
    });

    it('a read-only query receives a finder and cannot save or delete through it', async () => {
      const finder: AggregateFinder<Customer> = {
        findById: async (id) => new Customer(id, new CustomerName('Ana')),
      };
      expect(await new GetCustomerName(finder).execute({ id: customerId })).toBe('Ana');
      expect('save' in finder).toBe(false);
      // @ts-expect-error a finder exposes no save
      expect(() => finder.save).toBeDefined();
    });

    it('the GDPR erasure use case only depends on delete', async () => {
      const removed: string[] = [];
      const remover: AggregateRemover<Customer> = {
        delete: async (id) => {
          removed.push(id.value);
        },
      };
      await new ForgetCustomer(remover).execute({ id: customerId });
      expect(removed).toEqual([customerId]);
    });

    it('one full repository adapter serves every role', async () => {
      const repository = new KeyValueCustomerRepository();
      await new RegisterCustomer(repository).execute({ id: customerId, name: 'Ana' });
      expect(await new GetCustomerName(repository).execute({ id: customerId })).toBe('Ana');
      await new ForgetCustomer(repository).execute({ id: customerId });
      await expect(new GetCustomerName(repository).execute({ id: customerId })).rejects.toThrow(
        AggregateNotFoundException,
      );
    });

    it('there is no all-in-one Repository port: an adapter implements each role it supports', () => {
      const adapter = new KeyValueCustomerRepository();
      expectTypeOf(adapter).toMatchTypeOf<AggregateFinder<Customer>>();
      expectTypeOf(adapter).toMatchTypeOf<AggregateSaver<Customer>>();
      expectTypeOf(adapter).toMatchTypeOf<AggregateRemover<Customer>>();
      const saverOnly: AggregateSaver<Customer> = { save: async () => undefined };
      // @ts-expect-error a saver alone cannot be used where a finder is needed
      const finder: AggregateFinder<Customer> = saverOnly;
      expect(finder).toBe(saverOnly);
    });
  });
});
