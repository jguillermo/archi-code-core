import { beforeEach, describe, expect, test } from '@jest/globals';
import { EphemeraDb } from './ephemera-db';

class Account {
  constructor(
    public id: string,
    public name: string,
    public type: string,
    public currency: string,
    public balance: number,
  ) {}
}

describe('EphemeraDb', () => {
  let repo: EphemeraDb<Account>;

  beforeEach(() => {
    repo = new EphemeraDb<Account>();
  });

  test('Should persist a new item correctly', async () => {
    const account = new Account('1', 'Account A', 'asset', 'USD', 1000);
    await repo.persist(account);

    const foundAccount = await repo.findById('1');
    expect(foundAccount).toEqual(account);
  });

  test('Should update an item if it already exists', async () => {
    const account = new Account('1', 'Account A', 'asset', 'USD', 1000);
    await repo.persist(account);

    account.balance = 2000;
    await repo.persist(account);

    const updatedAccount = await repo.findById('1');
    expect(updatedAccount?.balance).toBe(2000);
  });

  test('Should return null if an item is not found by ID', async () => {
    const foundAccount = await repo.findById('non-existent-id');
    expect(foundAccount).toBeNull();
  });

  test('Should return all items correctly', async () => {
    const account1 = new Account('1', 'Account A', 'asset', 'USD', 1000);
    const account2 = new Account('2', 'Account B', 'liability', 'USD', 500);

    await repo.persist(account1);
    await repo.persist(account2);

    const allAccounts = await repo.findAll();
    expect(allAccounts).toEqual([account1, account2]);
  });

  test('Should remove an item correctly by ID', async () => {
    const account = new Account('1', 'Account A', 'asset', 'USD', 1000);
    await repo.persist(account);

    const wasRemoved = await repo.remove('1');
    expect(wasRemoved).toBe(true);

    const foundAccount = await repo.findById('1');
    expect(foundAccount).toBeNull();
  });

  test('Should return false when trying to remove a non-existent item', async () => {
    const wasRemoved = await repo.remove('non-existent-id');
    expect(wasRemoved).toBe(false);
  });

  test('Should clear all items correctly', async () => {
    const account1 = new Account('1', 'Account A', 'asset', 'USD', 1000);
    const account2 = new Account('2', 'Account B', 'liability', 'USD', 500);

    await repo.persist(account1);
    await repo.persist(account2);

    await repo.clear();

    const allAccounts = await repo.findAll();
    expect(allAccounts).toEqual([]);
  });

  test('Should handle an empty list correctly', async () => {
    const allAccounts = await repo.findAll();
    expect(allAccounts).toEqual([]);
  });
});
