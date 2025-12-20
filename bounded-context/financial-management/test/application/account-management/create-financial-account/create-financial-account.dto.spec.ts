import { describe, expect, it } from '@jest/globals';
import { validate } from 'class-validator';
import { CreateFinancialAccountObjectMother } from './create-financial-account.object-mother';

describe('CreateFinancialAccountObjectMother Validation', () => {
  it('should validate a valid DTO created by the Object Mother', async () => {
    const dto = CreateFinancialAccountObjectMother.create(1); // Level 1 object

    const errors = await validate(dto);
    expect(errors.length).toBe(0); // No validation errors
  });

  it('should invalidate a DTO with an invalid id', async () => {
    const dto = CreateFinancialAccountObjectMother.create(1, { id: 'invalid-id' }); // Invalid ObjectId

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('id');
  });

  it('should invalidate a DTO with an invalid name', async () => {
    const dto = CreateFinancialAccountObjectMother.create(1, { name: '' }); // Invalid name

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });

  it('should invalidate a DTO with an invalid currency', async () => {
    const dto = CreateFinancialAccountObjectMother.create(1, { currency: 'US' }); // Invalid currency code

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('currency');
  });

  it('should invalidate a DTO with invalid tags', async () => {
    const dto = CreateFinancialAccountObjectMother.create(3, { tags: ['ValidTag', 'InvalidTagWithMoreThan50Characters'] });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('tags');
  });

  it('should validate a DTO created at level 2 with valid financialEntity and accountNumber', async () => {
    const dto = CreateFinancialAccountObjectMother.create(2); // Level 2 object

    const errors = await validate(dto);
    expect(errors.length).toBe(0); // No validation errors
  });

  it('should invalidate a DTO at level 2 with an empty financialEntity', async () => {
    const dto = CreateFinancialAccountObjectMother.create(2, { financialEntity: '' }); // Invalid financialEntity

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('financialEntity');
  });

  it('should validate a DTO with custom tags at level 3', async () => {
    const dto = CreateFinancialAccountObjectMother.create(3, { tags: ['CustomTag'] }); // Level 3 with custom tags

    const errors = await validate(dto);
    expect(errors.length).toBe(0); // No validation errors
    expect(dto.tags).toEqual(['CustomTag']);
  });

  it('should exclude properties correctly when creating a DTO', async () => {
    const dto = CreateFinancialAccountObjectMother.create(1, {}, ['id', 'name']); // Exclude id and name

    expect(dto.id).toBeUndefined();
    expect(dto.name).toBeUndefined();
    const errors = await validate(dto);
    expect(errors.length).toBe(2); // No validation errors for other properties
  });
});
