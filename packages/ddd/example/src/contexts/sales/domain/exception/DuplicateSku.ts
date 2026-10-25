import { DomainException } from '../../../../ddd/domain';

export class DuplicateSku extends DomainException {
  constructor(sku: string) {
    super(`The SKU ${sku} appears in more than one line`, ['SAL002']);
  }
}
