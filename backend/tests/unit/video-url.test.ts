import '../helpers/env';
import { describe, it, expect } from 'vitest';
import { validateVideoUrl, validateImageUrl } from '../../src/utils/video-url';

describe('validateVideoUrl', () => {
  it('accepts a valid https URL and normalizes it', () => {
    const result = validateVideoUrl('https://cdn.example.com/videos/movie.mp4');
    expect(result.ok).toBe(true);
    expect(result.normalizedUrl).toBe('https://cdn.example.com/videos/movie.mp4');
    expect(result.reason).toBeUndefined();
  });

  it('accepts http URLs in non-production', () => {
    const result = validateVideoUrl('http://cdn.example.com/v.mp4');
    expect(result.ok).toBe(true);
    expect(result.normalizedUrl).toBe('http://cdn.example.com/v.mp4');
  });

  it('rejects empty / whitespace-only input', () => {
    expect(validateVideoUrl('').ok).toBe(false);
    expect(validateVideoUrl('   ').ok).toBe(false);
    expect(validateVideoUrl('').reason).toBeTruthy();
  });

  it('rejects dangerous schemes', () => {
    expect(validateVideoUrl('javascript:alert(1)').ok).toBe(false);
    expect(validateVideoUrl('data:text/html,<h1>hi</h1>').ok).toBe(false);
    expect(validateVideoUrl('file:///etc/passwd').ok).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(validateVideoUrl('not a url').ok).toBe(false);
    expect(validateVideoUrl('http://').ok).toBe(false);
    expect(validateVideoUrl('://missing-scheme').ok).toBe(false);
    expect(validateVideoUrl('not a url').reason).toBe('URL video tidak valid');
  });

  it('rejects URLs longer than 2048 characters', () => {
    const long = 'https://example.com/' + 'a'.repeat(3000);
    const result = validateVideoUrl(long);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/panjang/i);
  });
});

describe('validateImageUrl', () => {
  it('treats empty input as ok with an empty normalized URL', () => {
    const empty = validateImageUrl('');
    expect(empty.ok).toBe(true);
    expect(empty.normalizedUrl).toBe('');

    const blank = validateImageUrl('   ');
    expect(blank.ok).toBe(true);
    expect(blank.normalizedUrl).toBe('');
  });

  it('accepts http and https URLs', () => {
    expect(validateImageUrl('https://cdn.example.com/poster.png').ok).toBe(true);
    expect(validateImageUrl('http://cdn.example.com/poster.png').ok).toBe(true);
    expect(validateImageUrl('https://cdn.example.com/poster.png').normalizedUrl).toBe(
      'https://cdn.example.com/poster.png',
    );
  });

  it('rejects javascript: and other non-http schemes', () => {
    expect(validateImageUrl('javascript:alert(1)').ok).toBe(false);
    expect(validateImageUrl('data:image/png;base64,AAAA').ok).toBe(false);
    expect(validateImageUrl('file:///tmp/x.png').ok).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(validateImageUrl('not a url').ok).toBe(false);
    expect(validateImageUrl('http://').ok).toBe(false);
  });

  it('rejects URLs longer than 2048 characters', () => {
    const long = 'https://example.com/' + 'a'.repeat(3000);
    expect(validateImageUrl(long).ok).toBe(false);
  });
});
