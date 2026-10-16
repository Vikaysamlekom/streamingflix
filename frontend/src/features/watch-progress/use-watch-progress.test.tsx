import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useWatchProgress } from './use-watch-progress';
import { STORAGE_KEYS } from '@/utils/storage';

const KEY = STORAGE_KEYS.watchProgress;

function stored(): Record<string, unknown> | undefined {
  const raw = localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : undefined;
}

describe('useWatchProgress', () => {
  beforeEach(() => localStorage.clear());

  it('menyimpan posisi tontonan', () => {
    const { result } = renderHook(() => useWatchProgress());
    act(() => result.current.save('movie', 30, 100));
    expect(result.current.get('movie')?.positionSec).toBe(30);
    expect(result.current.get('movie')?.durationSec).toBe(100);
    expect(stored()).toHaveProperty('movie');
  });

  it('menghapus entri ketika mencapai ambang selesai (>= 95%)', () => {
    const { result } = renderHook(() => useWatchProgress());
    act(() => result.current.save('movie', 30, 100));
    act(() => result.current.save('movie', 96, 100));
    expect(result.current.get('movie')).toBeUndefined();
    expect(stored()).not.toHaveProperty('movie');
  });

  it('tetap menyimpan pada 94% (belum selesai)', () => {
    const { result } = renderHook(() => useWatchProgress());
    act(() => result.current.save('movie', 94, 100));
    expect(result.current.get('movie')?.positionSec).toBe(94);
  });

  it('mengabaikan durasi yang tidak valid', () => {
    const { result } = renderHook(() => useWatchProgress());
    act(() => result.current.save('movie', 10, 0));
    expect(result.current.get('movie')).toBeUndefined();
  });

  it('remove menghapus satu entri', () => {
    const { result } = renderHook(() => useWatchProgress());
    act(() => result.current.save('a', 10, 100));
    act(() => result.current.remove('a'));
    expect(result.current.get('a')).toBeUndefined();
  });

  it('retainOnly membuang progres film yang tidak ada di katalog', () => {
    const { result } = renderHook(() => useWatchProgress());
    act(() => result.current.save('a', 10, 100));
    act(() => result.current.save('b', 20, 100));
    act(() => result.current.retainOnly(['a']));
    expect(Object.keys(result.current.progress)).toEqual(['a']);
  });

  it('mengabaikan data localStorage yang tidak valid', () => {
    localStorage.setItem(KEY, JSON.stringify({ movie: { positionSec: 'x' } }));
    const { result } = renderHook(() => useWatchProgress());
    expect(result.current.progress).toEqual({});
  });
});
