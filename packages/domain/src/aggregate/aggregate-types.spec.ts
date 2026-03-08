import { describe, expect, it } from '@jest/globals';
import { Level } from '../level/level.decorator';
import { AddValidate } from '../validator/decorator/type-validator';
import { AbstractArrayType, IdType, StringTypeRequired } from '../type';
import { Validate } from 'class-validator';
import { DomainValidator } from '../validator';
import { AggregateRoot } from './aggregate-root';
import { DataTypes } from '../primitive/primitive-types';
import { AggregateTypes } from './aggregate-types';
import { PrimitiveType } from '../primitive/primitive-type';

class CompanyId extends IdType {}

@Level(1)
@AddValidate([{ validator: 'MinLength', value: 1 }])
class CompanyName extends StringTypeRequired {}

@Level(2)
@AddValidate([{ validator: 'MinLength', value: 2 }])
class CompanyDescription extends StringTypeRequired {
  static empty(): CompanyDescription {
    return new CompanyDescription('');
  }
}

@Level(2)
@AddValidate([{ validator: 'MinLength', value: 3 }])
class CompanyAddress extends StringTypeRequired {
  static empty(): CompanyAddress {
    return new CompanyAddress('');
  }
}

@Level(3)
@AddValidate([{ validator: 'MinLength', value: 4 }])
class CompanySlug extends StringTypeRequired {
  static empty(): CompanySlug {
    return new CompanySlug('');
  }
}

@AddValidate([{ validator: 'MinLength', value: 3 }])
class CompanyTag extends StringTypeRequired {}

@Level(4)
@AddValidate([{ validator: 'ArrayMinSize', value: 1 }])
class CompanyTags extends AbstractArrayType<CompanyTag> {
  getItemClass(value: PrimitiveType<CompanyTag>): CompanyTag {
    return new CompanyTag(value);
  }

  static empty(): CompanyTags {
    return new CompanyTags([]);
  }
}

class CompanyDto {
  @Validate(DomainValidator, [CompanyId])
  public id?: string;

  @Validate(DomainValidator, [CompanyName])
  public name?: string;

  @Validate(DomainValidator, [CompanyDescription])
  public description?: string;

  @Validate(DomainValidator, [CompanyAddress])
  public address?: string;

  @Validate(DomainValidator, [CompanySlug])
  public slug?: string;

  @Validate(DomainValidator, [CompanyTags])
  public tags?: string[];

  public levelValidation?: number;
}

class CompanyData extends AggregateTypes {
  public readonly id: CompanyId;
  public readonly name: CompanyName;
  public readonly description: CompanyDescription;
  public readonly address: CompanyAddress;
  public readonly slug: CompanySlug;
  public readonly tags: CompanyTags;

  constructor(currentLevel: number, params: DataTypes<CompanyData>) {
    super(currentLevel);
    this.id = this.initializeType(CompanyId, params.id);
    this.name = this.initializeType(CompanyName, params.name);
    this.description = this.initializeType(CompanyDescription, params.description);
    this.address = this.initializeType(CompanyAddress, params.address);
    this.slug = this.initializeType(CompanySlug, params.slug);
    this.tags = this.initializeType(CompanyTags, params.tags);
  }
}

class Company extends AggregateRoot {
  constructor(
    private readonly id: CompanyId,
    private readonly name: CompanyName,
    private readonly description: CompanyDescription,
    private readonly address: CompanyAddress,
    private readonly slug: CompanySlug,
    private readonly tags: CompanyTags,
  ) {
    super();
  }

  static create(data: CompanyData): Company {
    return new Company(data.id, data.name, data.description, data.address, data.slug, data.tags);
  }
}

describe('AggregateData Tests', () => {
  const companyIdString = 'ddeddd9f-8fa7-4aea-815f-594a634d4f40';
  describe('Constructor tests level 3', () => {
    it('should correctly initialize all fields when valid data is provided', () => {
      const data = new CompanyData(3, {
        id: companyIdString,
        name: 'ValidName',
        description: 'ValidDescription',
        address: 'ValidAddress',
        slug: 'ValidSlug',
      });

      expect(data.id).toBeInstanceOf(CompanyId);
      expect(data.id.value).toBe(companyIdString);
      expect(data.name).toBeInstanceOf(CompanyName);
      expect(data.name.value).toBe('ValidName');
      expect(data.description).toBeInstanceOf(CompanyDescription);
      expect(data.address).toBeInstanceOf(CompanyAddress);
      expect(data.slug).toBeInstanceOf(CompanySlug);
      expect(data.tags).toBeInstanceOf(CompanyTags);
    });

    it('should throw an error if id is invalid', () => {
      expect(() => {
        new CompanyData(3, {
          id: '',
          name: 'ValidName',
          description: 'ValidDescription',
          address: 'ValidAddress',
          slug: 'ValidSlug',
        });
      }).toThrow('Validation Error: Expected a valid UUID, but received "".');
    });

    it('should throw an error if name does not meet validation rules', () => {
      expect(() => {
        new CompanyData(3, {
          id: companyIdString,
          name: '',
          description: 'ValidDescription',
          address: 'ValidAddress',
          slug: 'ValidSlug',
          tags: ['ValidTag'],
        });
      }).toThrow('CompanyName: should not be empty, must be longer than or equal to 1 characters');
    });

    it('should throw an error if description does not meet validation rules', () => {
      expect(() => {
        new CompanyData(3, {
          id: companyIdString,
          name: 'ValidName',
          description: 'A',
          address: 'ValidAddress',
          slug: 'ValidSlug',
          tags: ['ValidTag'],
        });
      }).toThrow('CompanyDescription: must be longer than or equal to 2 characters');
    });

    it('should throw an error if address does not meet validation rules', () => {
      expect(() => {
        new CompanyData(3, {
          id: companyIdString,
          name: 'ValidName',
          description: 'ValidDescription',
          address: 'AB',
          slug: 'ValidSlug',
          tags: ['ValidTag'],
        });
      }).toThrow('CompanyAddress: must be longer than or equal to 3 characters');
    });

    it('should throw an error if slug does not meet validation rules', () => {
      expect(() => {
        new CompanyData(3, {
          id: companyIdString,
          name: 'ValidName',
          description: 'ValidDescription',
          address: 'ValidAddress',
          slug: 'ABC',
          tags: ['ValidTag'],
        });
      }).toThrow('CompanySlug: must be longer than or equal to 4 characters');
    });
    it('should throw an error if slug does not meet validation rules', () => {
      expect(() => {
        new CompanyData(3, {
          id: companyIdString,
          name: 'ValidName',
          description: 'ValidDescription',
          address: 'ValidAddress',
          slug: 'ValidSlug',
          tags: ['s'],
        });
      }).toThrow('CompanyTags: Item 1: must be longer than or equal to 3 characters');
    });
    it('should throw an error if slug does not meet validation rules', () => {
      expect(() => {
        new CompanyData(4, {
          id: companyIdString,
          name: 'ValidName',
          description: 'ValidDescription',
          address: 'ValidAddress',
          slug: 'ValidSlug',
        });
      }).toThrow('CompanyTags: Value must be an array');
    });
    it('should throw an error if slug does not meet validation rules', () => {
      expect(() => {
        new CompanyData(4, {
          id: companyIdString,
          name: 'ValidName',
          description: 'ValidDescription',
          address: 'ValidAddress',
          slug: 'ValidSlug',
          tags: [],
        });
      }).toThrow('CompanyTags: must contain at least 1 elements');
    });
    it('should throw an error if slug does not meet validation rules', () => {
      expect(() => {
        new CompanyData(4, {
          id: companyIdString,
          name: 'ValidName',
          description: 'ValidDescription',
          address: 'ValidAddress',
          slug: 'ValidSlug',
          tags: '' as any,
        });
      }).toThrow('value  is not a Array.');
    });
  });

  describe('Level-based validation tests', () => {
    it('should allow empty description, address, and slug if currentLevel is 1', () => {
      const data = new CompanyData(1, {
        id: companyIdString,
        name: 'ValidName',
        description: undefined, // Below level
        address: undefined, // Below level
        slug: undefined, // Below level
        tags: undefined, // Below level
      });

      expect(data.description.value).toBe('');
      expect(data.address.value).toBe('');
      expect(data.slug.value).toBe('');
    });

    it('should throw an error if description is required but empty due to level 2', () => {
      expect(() => {
        new CompanyData(2, {
          id: companyIdString,
          name: 'ValidName',
          description: undefined, // Level 2 requires description
          address: 'ValidAddress',
          slug: undefined,
          tags: undefined,
        });
      }).toThrow(
        'CompanyDescription: must be a string, should not be empty, must be longer than or equal to 2 characters',
      );
    });

    it('should throw an error if address is required but empty due to level 2', () => {
      expect(() => {
        new CompanyData(2, {
          id: companyIdString,
          name: 'ValidName',
          description: 'ValidDescription',
          address: undefined, // Level 2 requires address
          slug: undefined,
          tags: undefined,
        });
      }).toThrow(
        'CompanyAddress: must be a string, should not be empty, must be longer than or equal to 3 characters',
      );
    });

    it('should allow empty slug if currentLevel is 2', () => {
      const data = new CompanyData(2, {
        id: companyIdString,
        name: 'ValidName',
        description: 'ValidDescription',
        address: 'ValidAddress',
        slug: undefined, // Below level
        tags: undefined,
      });

      expect(data.slug.value).toBe('');
      expect(data.tags.value).toEqual([]);
    });

    it('should throw an error if slug is required but empty due to level 3', () => {
      expect(() => {
        new CompanyData(3, {
          id: companyIdString,
          name: 'ValidName',
          description: 'ValidDescription',
          address: 'ValidAddress',
          slug: undefined, // Level 3 requires slug
          tags: undefined,
        });
      }).toThrow(
        'CompanySlug: must be a string, should not be empty, must be longer than or equal to 4 characters',
      );
    });
  });

  describe('Validation exception tests', () => {
    it('should throw a validation error with the correct message if any field fails validation', () => {
      expect(() => {
        new CompanyData(3, {
          id: companyIdString,
          name: 'ValidName',
          description: 'ValidDescription',
          address: 'AB', // Invalid address
          slug: 'ValidSlug',
          tags: undefined,
        });
      }).toThrow('CompanyAddress: must be longer than or equal to 3 characters');
    });

    it('should throw a DomainException with correct field name if instance validation fails', () => {
      expect(() => {
        new CompanyData(3, {
          id: companyIdString,
          name: 'ValidName',
          description: 'ValidDescription',
          address: 'ValidAddress',
          slug: 'ABC', // Invalid slug
        });
      }).toThrow('CompanySlug: must be longer than or equal to 4 characters');
    });
  });

  describe('Edge case tests', () => {
    it('should throw an error if a required field is explicitly set to null', () => {
      expect(() => {
        new CompanyData(3, {
          id: companyIdString,
          name: 'ValidName',
          description: null as any, // Explicit null
          address: 'ValidAddress',
          slug: 'ValidSlug',
        });
      }).toThrow(
        'CompanyDescription: must be a string, should not be empty, must be longer than or equal to 2 characters',
      );
    });

    it('validate level 1 by default', async () => {
      expect(() => {
        const obj = new CompanyDto();
        obj.levelValidation = 1;

        const data = new CompanyData(1, {
          id: 'ddeddd9f-8fa7-4aea-815f-594a634d4f40',
          name: 'name22',
          //description: 'description',
          //address: 'address',
          slug: 's',
        });
        Company.create(data);
      }).toThrow('CompanySlug: must be longer than or equal to 4 characters');
    });
  });

  describe('Valid values', () => {
    const voMother = (params: DataTypes<CompanyData>) => {
      return new CompanyData(4, {
        id: params.id ?? companyIdString,
        name: params.name ?? 'ValidName',
        description: params.description ?? 'ValidDescription',
        address: params.address ?? 'ValidAddress',
        slug: params.slug ?? 'ValidSlug',
        tags: params.tags ?? ['ValidTag'],
      });
    };

    it('valid items', () => {
      const data = voMother({});
      expect(data.id).toBeInstanceOf(CompanyId);
      expect(data.name).toBeInstanceOf(CompanyName);
      expect(data.description).toBeInstanceOf(CompanyDescription);
      expect(data.address).toBeInstanceOf(CompanyAddress);
      expect(data.slug).toBeInstanceOf(CompanySlug);
      expect(data.tags).toBeInstanceOf(CompanyTags);
    });
    it('should valid array', () => {
      const data = voMother({ tags: ['ValidTag', 'ValidTag2'] });
      expect(data.tags.value).toEqual(['ValidTag', 'ValidTag2']);
    });
  });

  describe('level 1, run validate if value is empty', () => {
    it('should valid items', () => {
      expect(() => {
        new CompanyData(1, {
          id: companyIdString,
          name: undefined,
        });
      }).toThrow(
        'CompanyName: must be a string, should not be empty, must be longer than or equal to 1 characters',
      );
    });
    it('should valid items', () => {
      expect(() => {
        new CompanyData(1, {
          id: companyIdString,
        });
      }).toThrow(
        'CompanyName: must be a string, should not be empty, must be longer than or equal to 1 characters',
      );
    });
  });
});
