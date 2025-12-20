import { HttpStatus, INestApplication } from '@nestjs/common';
import { TestingAppModule } from '../testing-app-module';
import * as request from 'supertest';
import { JsonCompare } from '@code-core/test';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { getJwtPayload } from '../helper';

describe('Login (e2e) [auth/login/email-password (POST)]', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await TestingAppModule.createE2e());
  });

  it('valid values', async () => {
    await request(app.getHttpServer()).post(`/register-user/email-password`).send({
      name: 'Jose',
      email: 'admin@mail.com',
      password: '123456',
    });

    const bodyRequest = {
      email: 'admin@mail.com',
      password: '123456',
    };

    const requestCreate = await request(app.getHttpServer()).post(`/auth/login/email-password`).send(bodyRequest);
    expect(requestCreate.statusCode).toBe(HttpStatus.CREATED);
    const token = requestCreate.body.token;

    expect(
      JsonCompare.include(
        {
          id: 'UUID()',
          name: 'Jose',
          roles: ['user'],
        },
        getJwtPayload(token as string),
      ),
    ).toEqual([]);
  });

  it('invalid values', async () => {
    const bodyRequest = {
      email: 'noexist@mail.com',
      password: '123456',
    };

    const requestCreate = await request(app.getHttpServer()).post(`/auth/login/email-password`).send(bodyRequest);
    expect(requestCreate.statusCode).toBe(HttpStatus.BAD_REQUEST);

    expect(requestCreate.body).toEqual({
      code: 'AUTH-101',
      message: 'The user does not exist or the password is incorrect',
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
