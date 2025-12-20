import { ValidatorFn } from '@angular/forms';
import { DomainPropertyValidator } from './domain-property-validator';

export function domainValidator(typeCls: any): ValidatorFn {
    return (control) => {
        const type = new DomainPropertyValidator(1, typeCls, control.value);
        return type.isValid() ? null : { domainValidator: type.errorMessage() };
    };
}
