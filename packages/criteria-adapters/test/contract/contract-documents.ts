export interface ContractAddress {
  readonly city: string;
  readonly zip: string;
}

export interface ContractDocument {
  readonly id: string;
  readonly name: string | null;
  readonly age?: number | null;
  readonly active: boolean;
  readonly status: 'active' | 'pending' | 'blocked';
  readonly createdAt: Date;
  readonly tags?: readonly string[];
  readonly address?: ContractAddress;
  readonly email?: string | null;
  readonly title?: string;
  readonly lines?: readonly { readonly sku: string }[];
}

export function contractDay(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export function createContractDocuments(): ContractDocument[] {
  return [
    {
      id: 'd01',
      title: '\uFF71\uFF72',
      name: 'Ana',
      age: 30,
      active: true,
      status: 'active',
      createdAt: contractDay('2024-01-10'),
      tags: ['vip', 'new'],
      lines: [{ sku: 'A' }],
      address: { city: 'Huelva', zip: '21001' },
      email: 'ana@example.com',
    },
    {
      id: 'd02',
      title: '\u{1F600} smile',
      name: 'ana maría',
      age: 25,
      active: false,
      status: 'pending',
      createdAt: contractDay('2024-02-15'),
      tags: ['new'],
      lines: [{ sku: 'B' }, { sku: 'A' }],
      address: { city: 'Sevilla', zip: '41001' },
      email: null,
    },
    {
      id: 'd03',
      title: '\u0130stanbul',
      name: 'Bruno',
      age: null,
      active: true,
      status: 'blocked',
      createdAt: contractDay('2024-03-20'),
      tags: [],
      address: { city: 'Huelva', zip: '21002' },
    },
    {
      id: 'd04',
      title: 'stra\u00DFe',
      name: 'Carla',
      active: false,
      status: 'active',
      createdAt: contractDay('2023-12-31'),
      tags: ['vip'],
      email: 'carla@example.com',
    },
    {
      id: 'd05',
      title: '\u03A9mega',
      name: 'ÁLVARO',
      age: 41,
      active: true,
      status: 'active',
      createdAt: contractDay('2024-05-05'),
      tags: ['vip', 'pro'],
      address: { city: 'Madrid', zip: '28001' },
      email: 'alvaro@example.com',
    },
    {
      id: 'd06',
      title: '\u03C9mega',
      name: 'diego',
      age: 18,
      active: true,
      status: 'pending',
      createdAt: contractDay('2024-01-10'),
      tags: ['pro'],
      address: { city: 'huelva', zip: '21003' },
      email: 'diego@example.com',
    },
    {
      id: 'd07',
      title: '\u212A',
      name: 'Elena',
      age: 65,
      active: false,
      status: 'blocked',
      createdAt: contractDay('2022-06-01'),
      address: { city: 'Sevilla', zip: '41002' },
      email: null,
    },
    {
      id: 'd08',
      title: 'zeta',
      name: 'a.b*c',
      age: 30,
      active: true,
      status: 'active',
      createdAt: contractDay('2024-07-07'),
      tags: ['x'],
      address: { city: 'Huelva', zip: '21004' },
      email: 'regex@example.com',
    },
    {
      id: 'd09',
      name: null,
      age: 50,
      active: true,
      status: 'pending',
      createdAt: contractDay('2024-08-08'),
      tags: ['vip'],
      address: { city: 'Cádiz', zip: '11001' },
      email: 'nameless@example.com',
    },
  ];
}
