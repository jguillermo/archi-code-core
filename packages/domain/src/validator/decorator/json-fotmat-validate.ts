import { isEmail } from 'class-validator';

export const JSON_FORMAT_VALIDATES = {
  email: { type: 'string', validate: isEmail },
};
