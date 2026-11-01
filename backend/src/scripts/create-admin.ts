import readline from 'readline';
import 'dotenv/config';
import { env } from '../config/env';
import { closePool } from '../config/database';
import {
  findByEmail,
  insertAdmin,
  countAdmins,
} from '../modules/auth/auth.repository';
import { hashPassword } from '../modules/auth/auth.service';

/**
 * CLI pembuatan admin pertama.
 * Jalankan: npm run admin:create
 *
 * - Email & password diminta lewat prompt interaktif.
 * - Password tidak ditampilkan saat diketik dan tidak ditulis ke log/file.
 * - Tidak ada endpoint registrasi admin publik (bagian 8 master prompt).
 */

interface Options {
  email?: string;
  name?: string;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--email' && argv[i + 1]) opts.email = argv[++i];
    else if (arg === '--name' && argv[i + 1]) opts.name = argv[++i];
  }
  return opts;
}

function createInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())));
}

/** Membaca input tanpa menampilkan karakter (untuk password). */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(question);

    const wasRaw = stdin.isRaw;
    stdin.setRawMode?.(true);
    stdin.resume();

    let input = '';
    const onData = (char: Buffer) => {
      const str = char.toString('utf8');
      switch (str) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl-D
          stdin.setRawMode?.(wasRaw ?? false);
          stdin.pause();
          stdin.removeListener('data', onData);
          stdout.write('\n');
          resolve(input);
          break;
        case '\u0003': // Ctrl-C
          stdin.setRawMode?.(wasRaw ?? false);
          stdin.pause();
          process.stdout.write('\n');
          process.exit(1);
          break;
        case '\u007f': // Backspace
        case '\b':
          input = input.slice(0, -1);
          break;
        default:
          input += str;
          break;
      }
    };

    stdin.on('data', onData);
  });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const rl = createInterface();
  let rlClosed = false;

  const closeRl = () => {
    if (!rlClosed) {
      rl.close();
      rlClosed = true;
    }
  };

  try {
    console.log('\n=== StreamFlix — Buat Akun Admin ===\n');

    // Transparansi: tunjukkan database mana yang akan ditulisi,
    // agar tak pernah salah logika "admin dibuat ke DB lokal saat menandai produksi".
    console.log(`DB tujuan : ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}\n`);

    const existing = await countAdmins();
    if (existing > 0) {
      console.log(
        `Info: sudah ada ${existing} admin terdaftar. Anda akan menambah admin baru.\n`,
      );
    }

    // Email
    let email = opts.email ?? '';
    while (!email) {
      email = await ask(rl, 'Email admin: ');
    }
    email = email.toLowerCase();
    if (!isValidEmail(email)) {
      console.error('Error: format email tidak valid.');
      process.exit(1);
    }

    const dup = await findByEmail(email);
    if (dup) {
      console.error(`Error: email "${email}" sudah terdaftar.`);
      process.exit(1);
    }

    // Display name (opsional)
    const name = opts.name ?? (await ask(rl, 'Nama tampilan (opsional): '));
    closeRl();

    // Password (minimal 12 karakter)
    let password = '';
    while (password.length < 12) {
      password = await askHidden('Password (minimal 12 karakter, tidak ditampilkan): ');
      if (password.length < 12) {
        console.log('  Password minimal 12 karakter. Coba lagi.');
      }
    }

    const confirm = await askHidden('Konfirmasi password: ');
    if (password !== confirm) {
      console.error('Error: konfirmasi password tidak cocok.');
      process.exit(1);
    }

    const passwordHash = await hashPassword(password);
    const id = await insertAdmin({
      email,
      passwordHash,
      displayName: name || null,
    });

    console.log(`\n✓ Admin berhasil dibuat (id: ${id}, email: ${email}).`);
    console.log('  Silakan masuk di /admin/login.\n');
  } finally {
    closeRl();
  }
}

main()
  .then(async () => {
    await closePool();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('\nGagal membuat admin:', err instanceof Error ? err.message : err);
    await closePool();
    process.exit(1);
  });
