import { User } from './user';
import { UserId } from './types/userId';
import { UserEmail } from './types/userEmail';

export abstract class UserRepository {
  abstract findByEmail(email: UserEmail): Promise<User | null>;
  abstract findById(id: UserId): Promise<User | null>;
  abstract persist(user: User): Promise<void>;
}
