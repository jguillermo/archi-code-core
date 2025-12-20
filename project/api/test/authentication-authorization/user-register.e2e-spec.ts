import { HttpStatus, INestApplication } from '@nestjs/common';
import { TestingAppModule } from '../testing-app-module';
import * as request from 'supertest';
import { JsonCompare } from '@code-core/test';
import { UserId, UserRepository } from '@bounded-context/authentication-authorization';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

describe('User Register (e2e) [/user-register (POST)]', () => {
  let app: INestApplication;
  let userRepository: UserRepository;

  beforeAll(async () => {
    ({ app, userRepository } = await TestingAppModule.createE2e([UserRepository]));
  });

  it('valid values', async () => {
    const bodyRequest = {
      name: 'Jose',
      email: 'admin@mail.com',
      password: '123456',
    };

    const requestCreate = await request(app.getHttpServer()).post(`/register-user/email-password`).send(bodyRequest);
    expect(requestCreate.statusCode).toBe(HttpStatus.CREATED);

    const user = await userRepository.findById(new UserId(requestCreate.body.id));

    expect(
      JsonCompare.include(
        {
          id: requestCreate.body.id,
          name: 'Jose',
          roles: ['user'],
          authenticationDetails: {
            username_password: {
              userName: 'admin@mail.com',
            },
          },
        },
        user?.toJson(),
      ),
    ).toEqual([]);
  });

  it('Error user registered with valid values', async () => {
    const bodyRequest = {
      name: 'Jose',
      email: 'admin@mail.com',
      password: '123456',
    };

    await request(app.getHttpServer()).post(`/register-user/email-password`).send(bodyRequest);
    const requestCreate = await request(app.getHttpServer()).post(`/register-user/email-password`).send(bodyRequest);
    expect(requestCreate.statusCode).toBe(HttpStatus.BAD_REQUEST);

    expect(requestCreate.body).toEqual({
      code: 'AA0001',
      message: 'User already exists',
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
