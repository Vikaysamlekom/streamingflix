import { describe, expect, it } from 'vitest';
import {
  formatDuration,
  formatTimecode,
  formatViews,
  percent,
  truncate,
} from './format';

describe('formatDuration', () => {
  it('memformat menit menjadi jam/menit', () => {
    expect(formatDuration(90)).toBe('1j 30m');
    expect(formatDuration(120)).toBe('2j');
    expect(formatDuration(45)).toBe('45m');
  });

  it('mengembalikan string kosong untuk nilai tidak valid', () => {
    expect(formatDuration(0)).toBe('');
    expect(formatDuration(null)).toBe('');
    expect(formatDuration(undefined)).toBe('');
    expect(formatDuration(-10)).toBe('');
  });
});

describe('formatTimecode', () => {
  it('memformat detik ke mm:ss', () => {
    expect(formatTimecode(0)).toBe('0:00');
    expect(formatTimecode(65)).toBe('1:05');
  });

  it('memformat detik ke h:mm:ss bila lebih dari satu jam', () => {
    expect(formatTimecode(3661)).toBe('1:01:01');
  });

  it('menangani nilai negatif/tidak terhingga', () => {
    expect(formatTimecode(-5)).toBe('0:00');
    expect(formatTimecode(Number.POSITIVE_INFINITY)).toBe('0:00');
  });
});

describe('formatViews', () => {
  it('memformat jumlah penayangan dalam bahasa Indonesia', () => {
    expect(formatViews(999)).toBe('999');
    expect(formatViews(1500)).toBe('1.5rb');
    expect(formatViews(2_000_000)).toBe('2.0Jt');
  });
});

describe('percent', () => {
  it('menghitung persentase dan membatasinya 0-100', () => {
    expect(percent(50, 100)).toBe(50);
    expect(percent(0, 0)).toBe(0);
    expect(percent(200, 100)).toBe(100);
    expect(percent(-10, 100)).toBe(0);
  });
});

describe('truncate', () => {
  it('memotong teks yang lebih panjang dari batas', () => {
    expect(truncate('abcdef', 3)).toBe('ab…');
    expect(truncate('ab', 5)).toBe('ab');
  });
});
