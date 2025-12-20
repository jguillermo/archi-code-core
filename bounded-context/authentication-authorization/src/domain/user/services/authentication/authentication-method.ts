import { User } from '../../user';

export interface AuthenticationMethod {
  authenticate(credentials: Record<string, string>): Promise<User | null>;
}
