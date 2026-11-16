import { Validations } from '@archi-code/validation';
import { NumberType, Required } from '@archi-code/ddd/domain';

@Validations([
  { validator: 'isInt', properties: { min: 1, max: 50 }, message: 'From lesson 1 to lesson 50' },
])
export class LessonNumber extends Required(NumberType) {}
