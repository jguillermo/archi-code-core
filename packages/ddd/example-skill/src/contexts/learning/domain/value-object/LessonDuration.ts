import { Validations } from '@archi-code/validation';
import { NumberType, Required } from '@archi-code/ddd/domain';

@Validations([
  { validator: 'isInt', properties: { min: 1, max: 600 }, message: 'From 1 to 600 minutes' },
])
export class LessonDuration extends Required(NumberType) {}
