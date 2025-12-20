import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { FinancialManagementAppModule } from './financial-management-app/financial-management-app.module';
import { AuthenticationAuthorizationAppModule } from './authentication-authorization-app/authentication-authorization-app.module';
import { AuthenticationAuthorizationModule } from '../bounded-context/authentication-authorization/authentication-authorization.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import config from './app.config';
import { MongooseModule } from '@nestjs/mongoose';

export const MONGOOSE_SETTINGS = [
  MongooseModule.forRootAsync({
    useFactory: (_configService: ConfigService) => {
      return { uri: `${_configService.get('mongo.host')}` };
    },
    inject: [ConfigService],
  }),
];

@Module({
  imports: [
    ...MONGOOSE_SETTINGS,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    FinancialManagementAppModule,
    AuthenticationAuthorizationModule,
    AuthenticationAuthorizationAppModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
