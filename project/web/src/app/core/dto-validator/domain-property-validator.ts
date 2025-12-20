import { getLevel, normalizeLevel } from '@code-core/domain';

export class DomainPropertyValidator {
    constructor(
        private level: number,
        private _propertyCls: any,
        private _propertyValue: any = null
    ) {
        this.level = normalizeLevel(this.level);
    }

    isValid(): boolean {
        try {
            if (this.shouldSkipLevelValidation()) {
                return true;
            }
            const type = this.cls();
            return type.isValid();
        } catch (e) {
            return false;
        }
    }

    errorMessage(): string {
        try {
            if (this.shouldSkipLevelValidation()) {
                return '';
            }
            const type = this.cls();
            return type.validatorMessageStr();
        } catch (e) {
            if (e.message) {
                return e.message;
            }
            return 'Validation error';
        }
    }

    private cls() {
        return new this._propertyCls(this._propertyValue);
    }

    private shouldSkipLevelValidation(): boolean {
        if (this._propertyValue === '') {
            return false; // not skip level validation if value is not null
        }
        const level = getLevel(this._propertyCls);
        return level > this.level;
    }
}
