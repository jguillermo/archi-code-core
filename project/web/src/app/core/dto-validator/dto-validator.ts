import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export function dtoValidator<T>(dtoClass: new () => T): ValidatorFn {
    return async (
        control: AbstractControl
    ): Promise<ValidationErrors | null> => {
        const dtoInstance = plainToInstance(dtoClass, control.value); // Convierte el objeto del formulario en una instancia del DTO
        //TODO, mejorar la optimizacion al inicar el formluario, hay varias validaciones inicales ue se hacen, antes que el ussuario interatue con la web
        const errors = await validate(dtoInstance as any); // Ejecuta validaciones de class-validator
        if (errors.length > 0) {
            const errorMessages: Record<string, any> = {};

            errors.forEach((error) => {
                if (error.constraints) {
                    // Extrae el nombre del campo
                    const field = error.property;

                    // Guarda los errores en un formato que Angular pueda interpretar
                    errorMessages[field] = {
                        domainValidator: Object.values(error.constraints)[0],
                    };

                    // ✅ Asigna el error al FormControl específico dentro del FormGroup
                    control.get(field)?.setErrors(errorMessages[field]);
                }
            });
            return null;
        }
        return null;
    };
}
