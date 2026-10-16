import '../helpers/env';
import { describe, it, expect } from 'vitest';
import { slugify, uniqueSlug, isValidSlugFormat } from '../../src/utils/slug';

describe('slugify', () => {
  it('lowercases input', () => {
    expect(slugify('HELLO')).toBe('hello');
    expect(slugify('MiXeD CaSe')).toBe('mixed-case');
  });

  it('converts spaces to hyphens', () => {
    expect(slugify('hello world')).toBe('hello-world');
    expect(slugify('one two three')).toBe('one-two-three');
  });

  it('collapses multiple spaces and hyphens into a single hyphen', () => {
    expect(slugify('multiple   spaces')).toBe('multiple-spaces');
    expect(slugify('a---b')).toBe('a-b');
    expect(slugify('a - b')).toBe('a-b');
  });

  it('strips punctuation', () => {
    expect(slugify('Hello, World!!!')).toBe('hello-world');
    expect(slugify('what? (really)')).toBe('what-really');
    expect(slugify('a_b')).toBe('ab');
  });

  it('strips diacritics and non-ascii characters', () => {
    expect(slugify('Café Déjà Vu')).toBe('cafe-deja-vu');
    expect(slugify('Ünïcödé')).toBe('unicode');
    expect(slugify('Pokémon')).toBe('pokemon');
    expect(slugify('日本語 Title')).toBe('title');
  });

  it('trims leading/trailing whitespace and hyphens', () => {
    expect(slugify('   hello   ')).toBe('hello');
    expect(slugify('--Hello--World--')).toBe('hello-world');
    expect(slugify('  -- Hello   World --  ')).toBe('hello-world');
  });

  it('returns an empty string when nothing usable remains', () => {
    expect(slugify('')).toBe('');
    expect(slugify('   ')).toBe('');
    expect(slugify('!!!')).toBe('');
    expect(slugify('日本語')).toBe('');
  });
});

describe('uniqueSlug', () => {
  it('returns the slugified base when non-empty', () => {
    expect(uniqueSlug('Hello World')).toBe('hello-world');
    expect(uniqueSlug('Café')).toBe('cafe');
  });

  it('falls back to a random film- prefixed slug when base is empty', () => {
    const slug = uniqueSlug('');
    expect(slug).toMatch(/^film-[0-9a-f]{6}$/);
    expect(isValidSlugFormat(slug)).toBe(true);
  });

  it('falls back for whitespace / punctuation-only input', () => {
    expect(uniqueSlug('   ')).toMatch(/^film-[0-9a-f]{6}$/);
    expect(uniqueSlug('!!!')).toMatch(/^film-[0-9a-f]{6}$/);
  });
});

describe('isValidSlugFormat', () => {
  it('accepts lowercase alphanumeric and hyphen-separated slugs', () => {
    expect(isValidSlugFormat('hello-world')).toBe(true);
    expect(isValidSlugFormat('abc123')).toBe(true);
    expect(isValidSlugFormat('a')).toBe(true);
    expect(isValidSlugFormat('a-b-c-1')).toBe(true);
    expect(isValidSlugFormat('x'.repeat(255))).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(isValidSlugFormat('')).toBe(false);
    expect(isValidSlugFormat('Hello')).toBe(false);
    expect(isValidSlugFormat('hello world')).toBe(false);
    expect(isValidSlugFormat('hello_world')).toBe(false);
    expect(isValidSlugFormat('hello--world')).toBe(false);
    expect(isValidSlugFormat('-hello')).toBe(false);
    expect(isValidSlugFormat('hello-')).toBe(false);
    expect(isValidSlugFormat('héllo')).toBe(false);
    expect(isValidSlugFormat('hello!')).toBe(false);
    expect(isValidSlugFormat('x'.repeat(256))).toBe(false);
  });
});
