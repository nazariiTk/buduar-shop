import { describe, it, expect } from 'vitest';
import { getName, formatPrice } from './format';

describe('getName', () => {
  it('returns name when present', () => {
    expect(getName({ name: 'Шовковий халат' })).toBe('Шовковий халат');
  });

  it('falls back to name_uk when name is missing', () => {
    expect(getName({ name_uk: 'Мереживний бюстгальтер' })).toBe('Мереживний бюстгальтер');
  });

  it('prefers name over name_uk when both are provided', () => {
    expect(getName({ name: 'Корсет Будуар', name_uk: 'Стара назва' })).toBe('Корсет Будуар');
  });

  it('returns empty string for null and undefined', () => {
    expect(getName(null)).toBe('');
    expect(getName(undefined)).toBe('');
  });

  it('returns empty string for empty objects or empty names', () => {
    expect(getName({})).toBe('');
    expect(getName({ name: '' })).toBe('');
    expect(getName({ name: '', name_uk: '' })).toBe('');
  });
});

describe('formatPrice', () => {
  it('formats positive numbers with currency symbol', () => {
    expect(formatPrice(1250)).toMatch(/^1[\s\u00A0]250 ₴$/);
    expect(formatPrice(1250).replace(/\u00A0/g, ' ')).toBe('1 250 ₴');
    expect(formatPrice(99)).toBe('99 ₴');
  });

  it('formats numeric strings correctly', () => {
    expect(formatPrice('500')).toBe('500 ₴');
    expect(formatPrice('2500').replace(/\u00A0/g, ' ')).toBe('2 500 ₴');
  });

  it('returns "0 ₴" for zero', () => {
    expect(formatPrice(0)).toBe('0 ₴');
    expect(formatPrice('0')).toBe('0 ₴');
  });

  it('returns "0 ₴" for negative values', () => {
    expect(formatPrice(-100)).toBe('0 ₴');
    expect(formatPrice('-50')).toBe('0 ₴');
  });

  it('returns "0 ₴" for non-finite and invalid inputs', () => {
    expect(formatPrice(null)).toBe('0 ₴');
    expect(formatPrice(undefined)).toBe('0 ₴');
    expect(formatPrice(NaN)).toBe('0 ₴');
    expect(formatPrice(Infinity)).toBe('0 ₴');
    expect(formatPrice('invalid')).toBe('0 ₴');
    expect(formatPrice('')).toBe('0 ₴');
  });
});
