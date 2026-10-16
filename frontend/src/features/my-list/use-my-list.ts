import { useCallback, useEffect, useState } from 'react';
import { readJson, STORAGE_KEYS, writeJson } from '@/utils/storage';
import { MY_LIST_MAX, myListSchema, type MyList } from './schema';

/**
 * Hook Daftar Saya (tanpa akun, disimpan di localStorage).
 * Data divalidasi dengan Zod saat dibaca.
 * Menyinkronkan perubahan antar-tab lewat event `storage`.
 */
export function useMyList() {
  const [slugs, setSlugs] = useState<MyList>(() => {
    const parsed = myListSchema.safeParse(
      readJson<unknown>(STORAGE_KEYS.myList, []),
    );
    return parsed.success ? parsed.data : [];
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEYS.myList) return;
      const parsed = myListSchema.safeParse(
        readJson<unknown>(STORAGE_KEYS.myList, []),
      );
      setSlugs(parsed.success ? parsed.data : []);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const persist = useCallback((next: MyList) => {
    setSlugs(next);
    writeJson(STORAGE_KEYS.myList, next);
  }, []);

  const add = useCallback(
    (slug: string) => {
      setSlugs((prev) => {
        if (prev.includes(slug)) return prev;
        const next = [slug, ...prev].slice(0, MY_LIST_MAX);
        writeJson(STORAGE_KEYS.myList, next);
        return next;
      });
    },
    [],
  );

  const remove = useCallback((slug: string) => {
    setSlugs((prev) => {
      const next = prev.filter((s) => s !== slug);
      writeJson(STORAGE_KEYS.myList, next);
      return next;
    });
  }, []);

  const toggle = useCallback(
    (slug: string) => {
      setSlugs((prev) => {
        const next = prev.includes(slug)
          ? prev.filter((s) => s !== slug)
          : [slug, ...prev].slice(0, MY_LIST_MAX);
        writeJson(STORAGE_KEYS.myList, next);
        return next;
      });
    },
    [],
  );

  /** Buang slug yang tidak lagi ada di katalog (mis. film dihapus/unpublish). */
  const retainOnly = useCallback((validSlugs: string[]) => {
    setSlugs((prev) => {
      const allowed = new Set(validSlugs);
      const next = prev.filter((s) => allowed.has(s));
      if (next.length !== prev.length) {
        writeJson(STORAGE_KEYS.myList, next);
      }
      return next.length === prev.length ? prev : next;
    });
  }, []);

  const has = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  return { slugs, add, remove, toggle, has, retainOnly, persist };
}
