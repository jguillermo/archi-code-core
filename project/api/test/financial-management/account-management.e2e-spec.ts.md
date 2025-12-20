import { HttpStatus, INestApplication } from '@nestjs/common';
import { TestingAppModule } from '../testing-app-module';
import \* as request from 'supertest';
import { IdType } from '@code-core/domain';
import { AccountRepository } from '@bounded-context/financial-management';
import { JsonCompare } from '@code-core/test';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';


describe.skip('createFinancialAccount (e2e) [/account-management/create-financial-account (POST)]', () => {
let app: INestApplication;
let accountRepository: AccountRepository;

beforeAll(async () => {
({ app, accountRepository } = await TestingAppModule.createE2e([
AccountRepository,
]));
});

it('valid values', async () => {
const bodyRequest = {
id: IdType.random(),
name: 'namenamenamename',
type: 'Real',
currency: 'PEN',
balance: 10,
financialEntity: 'financialEntity',
number: '234234234234',
tags: ['tags1'],
};

    const requestCreate = await request(app.getHttpServer())
      .post(`/account-management/create-financial-account`)
      .send(bodyRequest);

    expect(requestCreate.body).toEqual({ status: 'success' });
    expect(requestCreate.statusCode).toBe(HttpStatus.CREATED);

    const account = await accountRepository.findById(bodyRequest.id);

    expect(
      JsonCompare.include(
        {
          name: 'namenamenamename',
          type: 'Real',
          currency: 'PEN',
          balance: 10,
          financialEntity: 'financialEntity',
          number: '234234234234',
          tags: ['tags1'],
        },
        account?.toJson(),
      ),
    ).toEqual([]);

});

it('invalid data', async () => {
const bodyRequest = {
id: IdType.random(),
name: 'namenamenamename',
type: 'REAL',
currency: 'PEN',
balance: 10,
financialEntity: 'financialEntity',
number: '234234234234',
tags: ['tags1'],
};

    const requestCreate = await request(app.getHttpServer())
      .post(`/account-management/create-financial-account`)
      .send(bodyRequest);

    expect(requestCreate.body).toEqual({
      error: 'Bad Request',
      message: [
        'Validation Error: Expected one of [Real, Virtual], but received "REAL".',
      ],
      statusCode: 400,
    });
    // expect(requestCreate.statusCode).toBe(HttpStatus.CREATED);

});

afterAll(async () => {
await app.close();
});
});
