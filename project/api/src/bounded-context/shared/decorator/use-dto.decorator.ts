import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import 'reflect-metadata';
import { getMetadataStorage, ValidationTypes } from 'class-validator';
import { ValidatorsDoc } from '@code-core/domain';

// 🔥 Función para agregar `@ApiProperty()` dinámicamente a un DTO externo
function applySwaggerMetadata(target: any) {
  const metadataStorage = getMetadataStorage();
  const constraints = metadataStorage.getTargetValidationMetadatas(target, target.prototype, false, false, []);

  const dtoInstance = new target(); // Instancia del DTO para obtener las propiedades
  const allProperties = Reflect.ownKeys(dtoInstance).filter((key) => typeof key === 'string'); // Todas las propiedades del DTO

  for (const propertyName of allProperties) {
    // 🔍 Buscar si la propiedad tiene validaciones
    const validationMetadata = constraints.filter((meta) => meta.propertyName === propertyName);

    let validatorClass: any = null;

    let documentation: any;
    if (validationMetadata && validationMetadata.length === 1 && validationMetadata[0].constraints.length > 0 && validationMetadata[0].type === ValidationTypes.CUSTOM_VALIDATION) {
      validatorClass = validationMetadata[0].constraints?.[0]; // Clase del validador
      documentation = Reflect.getMetadata('type:doc', validatorClass);
    } else {
      if (validationMetadata && validationMetadata.length === 0) {
        documentation = {
          schema: { type: 'string' },
          require: true,
        };
      } else {
        documentation = ValidatorsDoc.instance.generateDoc(validationMetadata);
      }
    }
    Reflect.decorate(
      [
        ApiProperty({
          ...documentation.schema,
          required: documentation.required,
        }),
      ],
      target.prototype,
      propertyName,
    );
  }
}

// 🔥 Decorador `@UseDto()` para registrar DTOs externos en Swagger sin modificarlos
export function UseDto(...dtos: any[]) {
  return function (target: any) {
    dtos.forEach((dto) => {
      applySwaggerMetadata(dto); // Convertir las propiedades en `@ApiProperty()`
      ApiExtraModels(dto); // Registrar en Swagger
    });
    return target;
  };
}
