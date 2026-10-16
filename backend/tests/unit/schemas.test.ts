import '../helpers/env';
import { describe, it, expect } from 'vitest';
import { loginSchema, changePasswordSchema } from '../../src/modules/auth/auth.schema';
import { moviePayloadSchema } from '../../src/modules/movies/movie.schema';
import { categoryPayloadSchema } from '../../src/modules/categories/category.schema';

/** Payload film minimal yang valid, dipakai sebagai basis test. */
const minimalMovie = {
  title: 'Film Contoh',
  videoUrl: 'https://cdn.example.com/videos/movie.mp4',
};

describe('loginSchema', () => {
  it('trims and lowercases the email', () => {
    const result = loginSchema.safeParse({
      email: '  Admin@Example.COM  ',
      password: 'secret123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('admin@example.com');
      expect(result.data.password).toBe('secret123');
    }
  });

  it('rejects invalid emails', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'missing-at-sign.com', password: 'x' }).success).toBe(false);
  });

  it('requires a password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('requires the current password', () => {
    expect(changePasswordSchema.safeParse({ newPassword: 'a'.repeat(12) }).success).toBe(false);
  });

  it('rejects a new password shorter than 12 characters', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'old-password',
      newPassword: 'a'.repeat(11),
    });
    expect(result.success).toBe(false);
  });

  it('accepts a new password of 12+ characters', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'old-password',
      newPassword: 'a'.repeat(12),
    });
    expect(result.success).toBe(true);
  });
});

describe('moviePayloadSchema', () => {
  it('requires title and videoUrl', () => {
    expect(moviePayloadSchema.safeParse({}).success).toBe(false);
    expect(moviePayloadSchema.safeParse({ title: 'X' }).success).toBe(false);
    expect(moviePayloadSchema.safeParse({ videoUrl: minimalMovie.videoUrl }).success).toBe(false);
    expect(moviePayloadSchema.safeParse(minimalMovie).success).toBe(true);
  });

  it('applies status, isFeatured and categoryIds defaults', () => {
    const result = moviePayloadSchema.safeParse(minimalMovie);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('draft');
      expect(result.data.isFeatured).toBe(false);
      expect(result.data.categoryIds).toEqual([]);
    }
  });

  it('rejects releaseYear outside the allowed range', () => {
    expect(
      moviePayloadSchema.safeParse({ ...minimalMovie, releaseYear: 1800 }).success,
    ).toBe(false);
    expect(
      moviePayloadSchema.safeParse({ ...minimalMovie, releaseYear: 3000 }).success,
    ).toBe(false);
    expect(
      moviePayloadSchema.safeParse({ ...minimalMovie, releaseYear: 1888 }).success,
    ).toBe(true);
    expect(
      moviePayloadSchema.safeParse({ ...minimalMovie, releaseYear: 2020 }).success,
    ).toBe(true);
  });

  it('rejects rating greater than 10 or negative', () => {
    expect(moviePayloadSchema.safeParse({ ...minimalMovie, rating: 11 }).success).toBe(false);
    expect(moviePayloadSchema.safeParse({ ...minimalMovie, rating: -1 }).success).toBe(false);
    expect(moviePayloadSchema.safeParse({ ...minimalMovie, rating: 10 }).success).toBe(true);
    expect(moviePayloadSchema.safeParse({ ...minimalMovie, rating: 0 }).success).toBe(true);
    expect(moviePayloadSchema.safeParse({ ...minimalMovie, rating: 5.5 }).success).toBe(true);
  });

  it('validates the status enum', () => {
    expect(moviePayloadSchema.safeParse({ ...minimalMovie, status: 'published' }).success).toBe(true);
    expect(moviePayloadSchema.safeParse({ ...minimalMovie, status: 'archived' }).success).toBe(false);
  });

  it('accepts a boolean isFeatured', () => {
    const result = moviePayloadSchema.safeParse({ ...minimalMovie, isFeatured: true });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isFeatured).toBe(true);
  });

  it('coerces and validates categoryIds', () => {
    expect(
      moviePayloadSchema.safeParse({ ...minimalMovie, categoryIds: [1, 2] }).success,
    ).toBe(true);

    const coerced = moviePayloadSchema.safeParse({ ...minimalMovie, categoryIds: ['1', '2'] });
    expect(coerced.success).toBe(true);
    if (coerced.success) expect(coerced.data.categoryIds).toEqual([1, 2]);

    expect(moviePayloadSchema.safeParse({ ...minimalMovie, categoryIds: [0] }).success).toBe(false);
    expect(moviePayloadSchema.safeParse({ ...minimalMovie, categoryIds: ['abc'] }).success).toBe(false);
    const tooMany = Array.from({ length: 31 }, (_, i) => i + 1);
    expect(moviePayloadSchema.safeParse({ ...minimalMovie, categoryIds: tooMany }).success).toBe(false);
  });

  it('rejects an invalid slug format but allows empty/omitted slugs', () => {
    expect(moviePayloadSchema.safeParse({ ...minimalMovie, slug: 'Bad Slug!' }).success).toBe(false);
    expect(moviePayloadSchema.safeParse({ ...minimalMovie, slug: 'good-slug' }).success).toBe(true);
    expect(moviePayloadSchema.safeParse({ ...minimalMovie, slug: '' }).success).toBe(true);
  });
});

describe('categoryPayloadSchema', () => {
  it('accepts a valid category name', () => {
    expect(categoryPayloadSchema.safeParse({ name: 'Action' }).success).toBe(true);
  });

  it('requires a non-empty name', () => {
    expect(categoryPayloadSchema.safeParse({}).success).toBe(false);
    expect(categoryPayloadSchema.safeParse({ name: '' }).success).toBe(false);
    expect(categoryPayloadSchema.safeParse({ name: '   ' }).success).toBe(false);
  });

  it('rejects names longer than 100 characters', () => {
    expect(categoryPayloadSchema.safeParse({ name: 'a'.repeat(100) }).success).toBe(true);
    expect(categoryPayloadSchema.safeParse({ name: 'a'.repeat(101) }).success).toBe(false);
  });

  it('accepts valid slugs and empty/omitted slugs', () => {
    expect(categoryPayloadSchema.safeParse({ name: 'Action', slug: 'action' }).success).toBe(true);
    expect(categoryPayloadSchema.safeParse({ name: 'Action', slug: '' }).success).toBe(true);
    expect(categoryPayloadSchema.safeParse({ name: 'Action' }).success).toBe(true);
  });

  it('rejects an invalid slug format', () => {
    expect(categoryPayloadSchema.safeParse({ name: 'Action', slug: 'Bad Slug' }).success).toBe(false);
    expect(categoryPayloadSchema.safeParse({ name: 'Action', slug: 'Bad_Slug' }).success).toBe(false);
  });
});
