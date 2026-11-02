import {
  AggregateRoot,
  ArrayType,
  BooleanType,
  Composite,
  CreatedAt,
  EnumType,
  NumberType,
  Required,
  StringType,
} from '@archi-code/ddd/domain';

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
  readonly tags?: readonly string[] | null;
  readonly address?: ContractAddress | null;
  readonly email?: string | null;
  readonly title?: string | null;
  readonly lines?: readonly { readonly sku: string }[] | null;
}

export class ContractId extends Required(StringType) {}

export class ContractName extends StringType {}

export class ContractAge extends NumberType {}

export class ContractActive extends Required(BooleanType) {}

export enum ContractStatusOption {
  ACTIVE = 'active',
  PENDING = 'pending',
  BLOCKED = 'blocked',
}

export class ContractStatusEnum extends EnumType<ContractStatusOption> {
  protected getEnum(): typeof ContractStatusOption {
    return ContractStatusOption;
  }
}

export class ContractStatus extends Required(ContractStatusEnum) {}

export class ContractTag extends Required(StringType) {}

export class ContractTags extends ArrayType<ContractTag> {
  protected createItem(value: unknown): ContractTag {
    return new ContractTag(value as string);
  }
}

export class ContractCity extends Required(StringType) {}

export class ContractZip extends Required(StringType) {}

export class ContractRecordAddress extends Composite({ city: ContractCity, zip: ContractZip }) {}

export class ContractEmail extends StringType {}

export class ContractTitle extends StringType {}

export class ContractSku extends Required(StringType) {}

export class ContractLine extends Composite({ sku: ContractSku }) {}

export class ContractRecord extends AggregateRoot<ContractId> {
  constructor(
    id: ContractId,
    readonly name: ContractName,
    readonly age: ContractAge,
    readonly active: ContractActive,
    readonly status: ContractStatus,
    readonly createdAt: CreatedAt,
    readonly tags: ContractTags,
    readonly address: ContractRecordAddress | null,
    readonly email: ContractEmail,
    readonly title: ContractTitle,
    readonly lines: readonly ContractLine[] | null,
  ) {
    super(id);
  }

  static fromPrimitives(document: ContractDocument): ContractRecord {
    return new ContractRecord(
      new ContractId(document.id),
      new ContractName(document.name),
      new ContractAge(document.age),
      new ContractActive(document.active),
      new ContractStatus(document.status as ContractStatusOption),
      new CreatedAt(document.createdAt),
      new ContractTags(
        document.tags === undefined || document.tags === null ? null : [...document.tags],
      ),
      document.address === undefined || document.address === null
        ? null
        : ContractRecordAddress.fromPrimitives(document.address),
      new ContractEmail(document.email),
      new ContractTitle(document.title),
      document.lines === undefined || document.lines === null
        ? null
        : document.lines.map((line) => ContractLine.fromPrimitives(line)),
    );
  }

  toPrimitives(): ContractDocument {
    return {
      id: this.id.value,
      name: this.name.value,
      age: this.age.value,
      active: this.active.value,
      status: this.status.value,
      createdAt: this.createdAt.value,
      tags: this.tags.value,
      address: this.address === null ? null : this.address.toPrimitives(),
      email: this.email.value,
      title: this.title.value,
      lines: this.lines === null ? null : this.lines.map((line) => line.toPrimitives()),
    };
  }
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

export function createContractRecords(): ContractRecord[] {
  return createContractDocuments().map((document) => ContractRecord.fromPrimitives(document));
}
