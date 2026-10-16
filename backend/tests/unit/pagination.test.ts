import '../helpers/env';
import { describe, it, expect } from 'vitest';
import {
  normalizePagination,
  buildPaginationMeta,
  isSortKey,
  getSortExpression,
  SORT_MAP,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from '../../src/utils/pagination';

describe('normalizePagination', () => {
  it('uses defaults when page/limit are undefined', () => {
    expect(normalizePagination()).toEqual({
      page: DEFAULT_PAGE,
      limit: DEFAULT_LIMIT,
      offset: 0,
    });
  });

  it('computes the offset from page and limit', () => {
    expect(normalizePagination(2, 50)).toEqual({ page: 2, limit: 50, offset: 50 });
    expect(normalizePagination(3, 20)).toEqual({ page: 3, limit: 20, offset: 40 });
    expect(normalizePagination(1, 100)).toEqual({ page: 1, limit: 100, offset: 0 });
  });

  it('clamps limit to MAX_LIMIT', () => {
    expect(normalizePagination(1, MAX_LIMIT + 1).limit).toBe(MAX_LIMIT);
    expect(normalizePagination(1, 5000).limit).toBe(MAX_LIMIT);
    expect(normalizePagination(1, 5000).offset).toBe(0);
  });

  it('clamps page and limit to a minimum of 1', () => {
    expect(normalizePagination(0, 0)).toEqual({ page: 1, limit: 1, offset: 0 });
    expect(normalizePagination(-5, -10)).toEqual({ page: 1, limit: 1, offset: 0 });
  });

  it('floors fractional input', () => {
    expect(normalizePagination(2.9, 10.8)).toEqual({ page: 2, limit: 10, offset: 10 });
  });
});

describe('buildPaginationMeta', () => {
  it('computes totalPages via ceiling', () => {
    expect(buildPaginationMeta(1, 20, 100).totalPages).toBe(5);
    expect(buildPaginationMeta(1, 10, 25).totalPages).toBe(3);
    expect(buildPaginationMeta(2, 10, 25).totalPages).toBe(3);
  });

  it('never returns fewer than 1 total page', () => {
    expect(buildPaginationMeta(1, 20, 0).totalPages).toBe(1);
  });

  it('echoes page, limit and total', () => {
    expect(buildPaginationMeta(3, 15, 42)).toEqual({
      page: 3,
      limit: 15,
      total: 42,
      totalPages: 3,
    });
  });
});

describe('isSortKey', () => {
  it('accepts allowlisted keys', () => {
    for (const key of Object.keys(SORT_MAP)) {
      expect(isSortKey(key)).toBe(true);
    }
  });

  it('rejects unknown / injection-ish values', () => {
    expect(isSortKey('evil')).toBe(false);
    expect(isSortKey('id; DROP TABLE movies')).toBe(false);
    expect(isSortKey('')).toBe(false);
  });
});

describe('getSortExpression', () => {
  it('returns the allowlisted expression for known keys', () => {
    expect(getSortExpression('newest')).toBe(SORT_MAP.newest);
    expect(getSortExpression('oldest')).toBe(SORT_MAP.oldest);
    expect(getSortExpression('title')).toBe(SORT_MAP.title);
    expect(getSortExpression('popular')).toBe(SORT_MAP.popular);
    expect(getSortExpression('rating')).toBe(SORT_MAP.rating);
  });

  it("falls back to 'newest' for undefined or unknown keys", () => {
    expect(getSortExpression(undefined)).toBe(SORT_MAP.newest);
    expect(getSortExpression('evil')).toBe(SORT_MAP.newest);
  });

  it('honors a custom fallback key', () => {
    expect(getSortExpression('evil', 'oldest')).toBe(SORT_MAP.oldest);
  });

  it('never returns the raw injection string', () => {
    const injection = 'id; DROP TABLE movies; --';
    const expression = getSortExpression(injection);
    expect(expression).toBe(SORT_MAP.newest);
    expect(expression).not.toContain('DROP');
    expect(expression.toLowerCase()).not.toContain('drop table');
    expect(expression).not.toContain(injection);
  });
});
