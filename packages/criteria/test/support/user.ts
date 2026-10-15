export interface UserPrimitives {
  id: string;
  name: string | null;
  age?: number | null;
  active: boolean;
  status: 'active' | 'pending' | 'blocked';
  createdAt: Date;
  tags: string[];
  scores?: number[];
  address?: {
    city: string;
    zip: string;
    geo: { lat: number; lng: number };
  };
  greet?: () => string;
}
