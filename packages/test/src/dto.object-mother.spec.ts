import { describe, expect, it } from '@jest/globals';
import { DtoObjectMother } from './dto.object-mother';

class TestDto {
  public readonly id?: string;
  public readonly name?: string;
  public readonly optionalField?: string;
}

export class TestDtoObjectMother extends DtoObjectMother<TestDto> {
  getNewDto(): TestDto {
    // Pass empty arguments since properties are readonly and optional
    return new TestDto();
  }

  getDefaultValues(): Partial<TestDto> {
    return {
      id: 'default-id',
      name: 'default-name',
      optionalField: 'default-optional',
    };
  }

  getPropertiesByLevel(): Record<number, Array<keyof TestDto>> {
    return {
      1: ['id', 'name'],
      2: ['optionalField'],
    };
  }
}

class TestDtoWithLevelValidation {
  public readonly levelValidation: number = 1;
  public readonly id?: string;
  public readonly name?: string;
  public readonly optionalField?: string;
}

export class TestDtoObjectMotherWithLevelValidation extends DtoObjectMother<TestDtoWithLevelValidation> {
  getNewDto(): TestDtoWithLevelValidation {
    // Pass empty arguments since properties are readonly and optional
    return new TestDtoWithLevelValidation();
  }

  getDefaultValues(): Partial<TestDtoWithLevelValidation> {
    return {
      id: 'default-id',
      name: 'default-name',
      optionalField: 'default-optional',
    };
  }

  getPropertiesByLevel(): Record<number, Array<keyof TestDtoWithLevelValidation>> {
    return {
      1: ['id', 'name'],
      2: ['optionalField'],
    };
  }
}

describe('TestDtoObjectMotherWithLevelValidation with TestDto', () => {
  it('should create a DTO with default values for level 1', () => {
    const dto = TestDtoObjectMotherWithLevelValidation.create(1);

    expect(dto).toBeInstanceOf(TestDtoWithLevelValidation);
    expect(dto.id).toBe('default-id');
    expect(dto.name).toBe('default-name');
    expect(dto.levelValidation).toBe(1);
    expect(dto.optionalField).toBeUndefined();
  });

  it('should create a DTO with default values for level 1 and pass optionalField', () => {
    const dto = TestDtoObjectMotherWithLevelValidation.create(1, { optionalField: 'custom-value' });

    expect(dto).toBeInstanceOf(TestDtoWithLevelValidation);
    expect(dto.id).toBe('default-id');
    expect(dto.name).toBe('default-name');
    expect(dto.optionalField).toBe('custom-value');
    expect(dto.levelValidation).toBe(1);
  });

  it('should include level 2 properties when level is 2', () => {
    const dto = TestDtoObjectMotherWithLevelValidation.create(2);

    expect(dto).toBeInstanceOf(TestDtoWithLevelValidation);
    expect(dto.id).toBe('default-id');
    expect(dto.name).toBe('default-name');
    expect(dto.optionalField).toBe('default-optional');
    expect(dto.levelValidation).toBe(2);
  });

  it('should override default values with provided overrides', () => {
    const dto = TestDtoObjectMotherWithLevelValidation.create(1, {
      id: 'custom-id',
      name: 'custom-name',
    });

    expect(dto.id).toBe('custom-id');
    expect(dto.name).toBe('custom-name');
    expect(dto.levelValidation).toBe(1);
    expect(dto.optionalField).toBeUndefined();
  });

  it('should exclude specified properties', () => {
    const dto = TestDtoObjectMotherWithLevelValidation.create(1, {}, ['id', 'name']);

    expect(dto.id).toBeUndefined();
    expect(dto.name).toBeUndefined();
    expect(dto.levelValidation).toBe(1);
    expect(dto.optionalField).toBeUndefined();
  });

  it('should handle overrides and exclusions together', () => {
    const dto = TestDtoObjectMotherWithLevelValidation.create(2, { name: 'custom-name' }, ['id']);

    expect(dto.id).toBeUndefined();
    expect(dto.name).toBe('custom-name');
    expect(dto.optionalField).toBe('default-optional');
    expect(dto.levelValidation).toBe(2);
  });

  it('should generate unique DTOs with independent overrides', () => {
    const dto1 = TestDtoObjectMotherWithLevelValidation.create(1, { id: 'unique-1' });
    const dto2 = TestDtoObjectMotherWithLevelValidation.create(1, { id: 'unique-2' });

    expect(dto1.id).toBe('unique-1');
    expect(dto1.levelValidation).toBe(1);

    expect(dto2.id).toBe('unique-2');
    expect(dto2.levelValidation).toBe(1);
  });
});

describe('ObjectMotherBase with TestDto', () => {
  it('should create a DTO with default values for level 1', () => {
    const dto = TestDtoObjectMother.create(1);

    expect(dto).toBeInstanceOf(TestDto);
    expect(dto.id).toBe('default-id');
    expect(dto.name).toBe('default-name');
    expect(dto.optionalField).toBeUndefined();
  });

  it('should create a DTO with default values for level 1 and pass optionalField', () => {
    const dto = TestDtoObjectMother.create(1, { optionalField: 'custom-value' });

    expect(dto).toBeInstanceOf(TestDto);
    expect(dto.id).toBe('default-id');
    expect(dto.name).toBe('default-name');
    expect(dto.optionalField).toBe('custom-value');
  });

  it('should include level 2 properties when level is 2', () => {
    const dto = TestDtoObjectMother.create(2);

    expect(dto).toBeInstanceOf(TestDto);
    expect(dto.id).toBe('default-id');
    expect(dto.name).toBe('default-name');
    expect(dto.optionalField).toBe('default-optional');
  });

  it('should override default values with provided overrides', () => {
    const dto = TestDtoObjectMother.create(1, {
      id: 'custom-id',
      name: 'custom-name',
    });

    expect(dto.id).toBe('custom-id');
    expect(dto.name).toBe('custom-name');
    expect(dto.optionalField).toBeUndefined();
  });

  it('should exclude specified properties', () => {
    const dto = TestDtoObjectMother.create(1, {}, ['id', 'name']);

    expect(dto.id).toBeUndefined();
    expect(dto.name).toBeUndefined();
    expect(dto.optionalField).toBeUndefined();
  });

  it('should handle overrides and exclusions together', () => {
    const dto = TestDtoObjectMother.create(2, { name: 'custom-name' }, ['id']);

    expect(dto.id).toBeUndefined();
    expect(dto.name).toBe('custom-name');
    expect(dto.optionalField).toBe('default-optional');
  });

  it('should generate unique DTOs with independent overrides', () => {
    const dto1 = TestDtoObjectMother.create(1, { id: 'unique-1' });
    const dto2 = TestDtoObjectMother.create(1, { id: 'unique-2' });

    expect(dto1.id).toBe('unique-1');
    expect(dto2.id).toBe('unique-2');
  });
});
