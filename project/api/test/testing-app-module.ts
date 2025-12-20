import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app/app.module';
import { AllExceptionsFilter } from '../src/app/shared/interceptor/all-exceptions.filter';

export interface TestingAppInterface {
  app: INestApplication;

  [key: string]: any;
}

export interface ProviderOverride {
  provide: any;
  useClass: any;
}

export interface Provider {
  name: string;
  useClass: any;
}

export class TestingAppModule {
  private _app: INestApplication;
  private _moduleFixture: TestingModule;

  protected async init(overrides: ProviderOverride[] = []): Promise<void> {
    const moduleBuilder = Test.createTestingModule({
      imports: [AppModule],
    });
    overrides.forEach(({ provide, useClass }) => {
      moduleBuilder.overrideProvider(provide).useClass(useClass);
    });
    this._moduleFixture = await moduleBuilder.compile();

    this._app = this._moduleFixture.createNestApplication();
    this._app.useGlobalFilters(new AllExceptionsFilter());
    this._app.useGlobalPipes(
      new ValidationPipe({
        whitelist: false,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    await this._app.init();
  }

  get app(): INestApplication {
    return this._app;
  }

  get moduleFixture(): TestingModule {
    return this._moduleFixture;
  }

  private static lowerCaseFirstLetter(str: string): string {
    if (!str) return str;
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  static async create(providers: any[] = [], overrides: ProviderOverride[] = []): Promise<TestingAppInterface> {
    try {
      const module = new TestingAppModule();
      await module.init(overrides);
      const response: TestingAppInterface = {
        app: module.app,
      };
      providers.forEach((provide) => {
        if (typeof provide === 'object' && !Array.isArray(provide) && provide.useClass) {
          response[provide.name] = module.moduleFixture.get(provide.useClass);
        } else {
          response[TestingAppModule.lowerCaseFirstLetter(provide.name)] = module.moduleFixture.get(provide);
        }
      });
      return response;
    } catch (error) {
      console.error('Error during beforeEach setup:', error);
      throw error;
    }
  }

  static async createE2e(providers: any[] | Provider[] = [], overrides: ProviderOverride[] = []): Promise<TestingAppInterface> {
    const defaultOverrides: ProviderOverride[] = [
      // {
      //   provide: DeviceRepository,
      //   useClass: DeviceInMemoryRepository,
      // },
    ];
    return TestingAppModule.create(providers, [...defaultOverrides, ...overrides]);
  }
}
