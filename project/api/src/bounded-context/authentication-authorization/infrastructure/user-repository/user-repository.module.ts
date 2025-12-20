import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserDocument, UserSchema } from './mongodb/mongodb-user-schema';
import { UserRepository } from '@bounded-context/authentication-authorization';
import { MongodbUserRepository } from './mongodb/mongodb-user-repository';

const UserRepoProvider = {
  provide: UserRepository,
  useClass: MongodbUserRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: UserDocument.name,
        schema: UserSchema,
      },
    ]),
  ],
  providers: [UserRepoProvider],
  exports: [UserRepoProvider],
})
export class UserRepositoryModule {}
