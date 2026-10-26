import { describe, expect, expectTypeOf, it } from 'vitest';
import { UseCase } from '../../src/application/index';
import {
  AggregateRepository,
  AggregateRoot,
  IdType,
  Required,
  StringType,
} from '../../src/domain/index';
import { AggregateNotFoundException } from '../../src/application/exceptions/aggregate-not-found.exception';
import type {
  AggregateFinder,
  AggregateRemover,
  AggregateSaver,
  PrimitiveTypes,
} from '../../src/domain/index';

class CustomerId extends IdType<'CustomerId'> {}
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

abstract class CustomerRepository
  extends AggregateRepository<Customer>
  implements AggregateFinder<Customer>, AggregateSaver<Customer>, AggregateRemover<Customer>
{
  abstract findById(id: CustomerId): Promise<Customer | null>;
  abstract save(customer: Customer): Promise<void>;
  abstract remove(customer: Customer): Promise<void>;
}

class KeyValueCustomerRepository extends CustomerRepository {
  readonly store = new Map<string, string>();

  async findById(id: CustomerId): Promise<Customer | null> {
    const row = this.store.get(id.value);
    return row === undefined ? null : Customer.fromPrimitives(JSON.parse(row));
  }

  async save(customer: Customer): Promise<void> {
    this.store.set(customer.id.value, JSON.stringify(customer.toPrimitives()));
  }

  async remove(customer: Customer): Promise<void> {
    this.store.delete(customer.id.value);
  }
}

class InvoiceId extends IdType<'InvoiceId'> {}

class Invoice extends AggregateRoot<InvoiceId> {}

abstract class InvoiceRepository
  extends AggregateRepository<Invoice>
  implements AggregateFinder<Invoice>, AggregateSaver<Invoice>
{
  abstract findById(id: InvoiceId): Promise<Invoice | null>;
  abstract save(invoice: Invoice): Promise<void>;
}

interface RegisterCustomerCommand {
  id: CustomerId;
  name: CustomerName;
}

class RegisterCustomer extends UseCase<
  { id: string; name: string },
  RegisterCustomerCommand,
  void
> {
  constructor(private readonly customers: CustomerRepository) {
    super();
  }

  protected toCommand(input: { id: string; name: string }): RegisterCustomerCommand {
    return { id: new CustomerId(input.id), name: new CustomerName(input.name) };
  }

  protected async handle(command: RegisterCustomerCommand): Promise<void> {
    await this.customers.save(new Customer(command.id, command.name));
  }
}

class ForgetCustomer extends UseCase<{ id: string }, CustomerId, void> {
  constructor(private readonly customers: CustomerRepository) {
    super();
  }

  protected toCommand(input: { id: string }): CustomerId {
    return new CustomerId(input.id);
  }

  protected async handle(id: CustomerId): Promise<void> {
    const customer = await this.customers.findById(id);
    if (customer === null) {
      throw new AggregateNotFoundException('Customer', id.value);
    }
    await this.customers.remove(customer);
  }
}

const customerId = '0f8c2b6e-3c1a-4c55-9a4e-0d6c1b2f7a10';

describe('Repository of an aggregate: one abstract class per aggregate in its domain, with the verbs its business needs', () => {
  it('fixes each verb with the signature of its role, typed by the aggregate and its id', () => {
    expectTypeOf<keyof CustomerRepository>().toEqualTypeOf<'findById' | 'save' | 'remove'>();
    expectTypeOf<CustomerRepository['findById']>().toEqualTypeOf<
      AggregateFinder<Customer>['findById']
    >();
    expectTypeOf<CustomerRepository['findById']>().toEqualTypeOf<
      (id: CustomerId) => Promise<Customer | null>
    >();
    expectTypeOf<CustomerRepository['save']>().toEqualTypeOf<
      (customer: Customer) => Promise<void>
    >();
    expectTypeOf<CustomerRepository['remove']>().toEqualTypeOf<
      (customer: Customer) => Promise<void>
    >();
  });

  it('invoices are never deleted, so their repository declares only findById and save', () => {
    expectTypeOf<keyof InvoiceRepository>().toEqualTypeOf<'findById' | 'save'>();
    expectTypeOf<InvoiceRepository>().not.toHaveProperty('remove');
  });

  it('a key-value adapter extends the repository of customers, saves a new one and loads it back', async () => {
    const repository = new KeyValueCustomerRepository();
    await repository.save(new Customer(new CustomerId(customerId), new CustomerName('Ana')));
    const loaded = await repository.findById(new CustomerId(customerId));
    expect(loaded?.toPrimitives()).toEqual({ id: customerId, name: 'Ana' });
    expect(repository).toBeInstanceOf(CustomerRepository);
  });

  it('returns null for a customer that was never saved', async () => {
    expect(await new KeyValueCustomerRepository().findById(new CustomerId(customerId))).toBeNull();
  });

  it('refuses an id of another type', async () => {
    const repository: CustomerRepository = new KeyValueCustomerRepository();
    // @ts-expect-error the repository looks customers up by CustomerId, not by raw text
    expect(await repository.findById(customerId)).toBeNull();
  });

  it('every use case of the aggregate receives the same repository', async () => {
    const repository = new KeyValueCustomerRepository();
    await new RegisterCustomer(repository).execute({ id: customerId, name: 'Ana' });
    expect(repository.store.has(customerId)).toBe(true);
    await new ForgetCustomer(repository).execute({ id: customerId });
    expect(repository.store.has(customerId)).toBe(false);
    await expect(new ForgetCustomer(repository).execute({ id: customerId })).rejects.toThrow(
      AggregateNotFoundException,
    );
  });

  it('a repository of another aggregate is refused where the repository of customers is needed', () => {
    expectTypeOf<InvoiceRepository>().not.toMatchTypeOf<CustomerRepository>();
    expectTypeOf<KeyValueCustomerRepository>().toMatchTypeOf<CustomerRepository>();
  });
});
