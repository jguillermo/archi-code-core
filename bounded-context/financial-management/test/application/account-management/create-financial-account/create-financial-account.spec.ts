import { beforeEach, describe, expect, it } from '@jest/globals';
import { CreateFinancialAccount } from '../../../../src/application/account-management/create-financial-account/create-financial-account';
import { InMemoryAccountRepository } from '../../../domain/account/in-memory-account-repository';
import { JsonCompare } from '@code-core/test';
import { CreateFinancialAccountObjectMother as dtoObjectMother } from './create-financial-account.object-mother';
import { validate } from 'class-validator';
import { AccountType } from '../../../../src/domain/account/types/account-type';
import { CreateFinancialAccountDto } from '../../../../src/application/account-management/create-financial-account/create-financial-account.dto';

describe('CreateFinancialAccount Use Case', () => {
  let useCase: CreateFinancialAccount;
  let accountRepository: InMemoryAccountRepository;

  beforeEach(() => {
    accountRepository = new InMemoryAccountRepository();
    useCase = new CreateFinancialAccount(accountRepository);
  });

  describe('happy path run in all levels', () => {
    [1, 2, 3].forEach((level) => {
      it(`should create a valid dto level ${level}`, async () => {
        const dto = dtoObjectMother.create(level);
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
        await useCase.execute(dto);
        const persistedAccount = await accountRepository.findById(dto.id ?? '');
        expect(JsonCompare.include({ id: dto.id }, persistedAccount?.toJson())).toEqual([]);
      });
    });
  });

  describe('Level 1 - Basic functionality', () => {
    it('should throw an error if initial balance is missing for a real account, with validation', async () => {
      expect(async () => {
        const dto = dtoObjectMother.create(1, { type: AccountType.enum().REAL }, ['balance']);
        const errors = await validate(dto);
        expect(errors.length).toBe(1);
        await useCase.execute(dto);
      }).rejects.toThrow('AccountBalance: must be a number, should not be empty');
    });

    it('should throw an error if initial balance is missing for a real account', async () => {
      expect(async () => {
        const dto = dtoObjectMother.create(1, { type: AccountType.enum().REAL }, ['balance']);
        await useCase.execute(dto);
      }).rejects.toThrow('AccountBalance: must be a number, should not be empty');
    });

    it('should create a virtual account without balance', async () => {
      const dto = dtoObjectMother.create(1, { type: AccountType.enum().VIRTUAL });
      await useCase.execute(dto);

      const persistedAccount = await accountRepository.findById(dto.id ?? '');
      expect(JsonCompare.include({ id: dto.id, balance: 0 }, persistedAccount?.toJson())).toEqual([]);
    });

    it('should throw an error if name is too short', () => {
      const dto = dtoObjectMother.create(1, { name: 'A' });
      expect(() => useCase.execute(dto)).rejects.toThrow();
    });
  });

  describe('Level 2 - Intermediate functionality', () => {
    it('should create a real account with financial details', async () => {
      const dto = dtoObjectMother.create(1, {
        name: 'Real Account with Details',
        type: 'Real',
        currency: 'USD',
        balance: 500,
        financialEntity: 'Bank X',
        number: '123456',
      });
      await useCase.execute(dto);

      const persistedAccount = await accountRepository.findById(dto.id ?? '');
      expect(
        JsonCompare.include(
          {
            id: dto.id,
            name: 'Real Account with Details',
            type: 'Real',
            currency: 'USD',
            balance: 500,
            financialEntity: 'Bank X',
            number: '123456',
          },
          persistedAccount?.toJson(),
        ),
      ).toEqual([]);
    });

    it('should throw an error if financial details are missing at level 2', async () => {
      const dto = new CreateFinancialAccountDto();
      dto.name = 'Real Account with Missing Details';
      dto.type = 'Real';
      dto.currency = 'USD';
      dto.balance = 1000;
      dto.levelValidation = 2;
      expect(() => useCase.execute(dto)).rejects.toThrow('AccountId: must be a UUID, should not be empty');
    });
  });

  describe('Level 3 - Advanced functionality', () => {
    it('should create an account with tags', async () => {
      const dto = dtoObjectMother.create(1, {
        name: 'Tagged Account',
        type: 'Virtual',
        currency: 'USD',
        tags: ['Project A', 'Marketing'],
      });
      await useCase.execute(dto);

      const persistedAccount = await accountRepository.findById(dto.id ?? '');
      expect(
        JsonCompare.include(
          {
            id: dto.id,
            name: 'Tagged Account',
            type: 'Virtual',
            currency: 'USD',
            tags: ['Project A', 'Marketing'],
            balance: 0,
          },
          persistedAccount?.toJson(),
        ),
      ).toEqual([]);
    });

    it('should throw an error if tags are not an array', () => {
      const dto = dtoObjectMother.create(3, {
        tags: 'InvalidTag' as any,
      });
      expect(() => useCase.execute(dto)).rejects.toThrow();
    });

    describe('Common validation errors', () => {
      it('should throw an error if currency is not provided', () => {
        const dto = new CreateFinancialAccountDto();
        dto.name = 'No Currency Account';
        dto.type = 'Real';
        dto.levelValidation = 1;

        expect(() => useCase.execute(dto)).rejects.toThrow();
      });

      it('should throw an error if type is invalid', () => {
        const dto = dtoObjectMother.create(1, {
          type: 'Invalid',
        });
        expect(() => useCase.execute(dto)).rejects.toThrow();
      });
    });
  });
});
