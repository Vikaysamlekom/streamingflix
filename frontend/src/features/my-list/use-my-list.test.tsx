import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useMyList } from './use-my-list';
import { MY_LIST_MAX } from './schema';
import { STORAGE_KEYS } from '@/utils/storage';

const KEY = STORAGE_KEYS.myList;

function stored(): unknown {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : undefined;
}

describe('useMyList', () => {
  beforeEach(() => localStorage.clear());

  it('menambahkan slug dan menyimpannya di localStorage', () => {
    const { result } = renderHook(() => useMyList());
    act(() => result.current.toggle('inception'));
    expect(result.current.has('inception')).toBe(true);
    expect(stored()).toEqual(['inception']);
  });

  it('tidak menambahkan duplikat', () => {
    const { result } = renderHook(() => useMyList());
    act(() => result.current.add('a'));
    act(() => result.current.add('a'));
    expect(result.current.slugs).toEqual(['a']);
  });

  it('menghapus slug dari daftar', () => {
    const { result } = renderHook(() => useMyList());
    act(() => result.current.add('a'));
    act(() => result.current.remove('a'));
    expect(result.current.slugs).toEqual([]);
    expect(stored()).toEqual([]);
  });

  it('membatasi jumlah slug maksimum', () => {
    const { result } = renderHook(() => useMyList());
    act(() => {
      for (let i = 0; i < MY_LIST_MAX + 10; i += 1) {
        result.current.add(`movie-${i}`);
      }
    });
    expect(result.current.slugs).toHaveLength(MY_LIST_MAX);
  });

  it('mengabaikan data localStorage yang tidak valid', () => {
    localStorage.setItem(KEY, '{bukan json');
    const { result } = renderHook(() => useMyList());
    expect(result.current.slugs).toEqual([]);
  });

  it('menolak data localStorage yang tidak sesuai skema', () => {
    localStorage.setItem(KEY, JSON.stringify([123, true]));
    const { result } = renderHook(() => useMyList());
    expect(result.current.slugs).toEqual([]);
  });

  it('retainOnly membuang slug yang tidak lagi ada di katalog', () => {
    const { result } = renderHook(() => useMyList());
    act(() => result.current.add('a'));
    act(() => result.current.add('b'));
    act(() => result.current.retainOnly(['b']));
    expect(result.current.slugs).toEqual(['b']);
    expect(stored()).toEqual(['b']);
  });
});
