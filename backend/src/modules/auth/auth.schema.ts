import { z } from 'zod';

/** Skema validasi login admin. */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email wajib diisi')
    .max(255, 'Email terlalu panjang')
    .email('Format email tidak valid')
    .transform((v) => v.toLowerCase()),
  password: z.string().min(1, 'Password wajib diisi').max(128, 'Password terlalu panjang'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Skema ganti password (minimal 12 karakter sesuai ketentuan pengaturan). */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password lama wajib diisi'),
  newPassword: z
    .string()
    .min(12, 'Password baru minimal 12 karakter')
    .max(128, 'Password terlalu panjang'),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
