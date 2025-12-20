import { User, UserRepository, UserTypes } from '@bounded-context/authentication-authorization';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../shared/mongo-db/mongo-repository';
import { UserDocument } from './mongodb-user-schema';
import { InjectModel } from '@nestjs/mongoose';
import { UserId } from '@bounded-context/authentication-authorization/src/domain/user/types/userId';
import { UserEmail } from '@bounded-context/authentication-authorization/dist/esm/domain/user/types/userEmail';

export class MongodbUserRepository extends UserRepository {
  private mongodb: MongoRepository<UserDocument, User>;

  constructor(
    @InjectModel(UserDocument.name)
    private model: Model<UserDocument>,
  ) {
    super();
    this.mongodb = new MongoRepository<UserDocument, User>(this.model, MongodbUserRepository.fromPrimitives);
  }

  async findByEmail(email: UserEmail): Promise<User | null> {
    return await this.mongodb.findOne({ email: email.value });
  }

  async persist(user: User): Promise<void> {
    const data = user.toJson();
    if (data.authenticationDetails?.username_password) {
      data['email'] = data.authenticationDetails?.username_password?.userName;
    }
    return await this.mongodb.persist(data);
  }

  static fromPrimitives(items: any): User {
    const data = new UserTypes(items.currentLevel, {
      id: items.id,
      name: items.name,
      roles: items.roles,
      authenticationDetails: items.authenticationDetails,
    });
    return User.create(data);
  }

  async findById(id: UserId): Promise<User | null> {
    return await this.mongodb.findById(id);
  }
}
