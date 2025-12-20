import { AbstractArrayType, AddValidate, Level, StringTypeRequired } from '@code-core/domain';

class TransactionTag extends StringTypeRequired {}

@Level(3)
@AddValidate([{ validator: 'IsOptional' }, { validator: 'ArrayMinSize', value: 1 }])
export class TransactionListTag extends AbstractArrayType<TransactionTag, null> {
  constructor(value: string[] | null = null) {
    super(value);
  }

  getItemClass(value: string): TransactionTag {
    return new TransactionTag(value);
  }
}
