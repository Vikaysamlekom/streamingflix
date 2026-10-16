import { z } from 'zod';

/** Skema validasi Daftar Saya di localStorage. */
export const myListSchema = z.array(z.string().min(1)).max(200);

export type MyList = z.infer<typeof myListSchema>;

export const MY_LIST_MAX = 200;
