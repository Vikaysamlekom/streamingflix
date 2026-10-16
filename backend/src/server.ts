import { createApp } from './app';
import { env } from './config/env';
import { closePool, isDatabaseHealthy } from './config/database';
import { logger } from './utils/logger';

/**
 * Entry point server.
 * - Cek koneksi database saat startup (peringatan bila gagal, tidak crash,
 *   agar health check tetap bisa melaporkan status).
 * - Tangani shutdown dengan benar (SIGTERM/SIGINT) dan tutup pool.
 */
async function main() {
  const app = createApp();

  const dbOk = await isDatabaseHealthy();
  if (dbOk) {
    logger.info('Koneksi database berhasil');
  } else {
    logger.warn(
      'Database tidak dapat dihubungi saat startup. Periksa konfigurasi DB_* di .env',
    );
  }

  const server = app.listen(env.PORT, () => {
    logger.info(
      `StreamFlix API berjalan di http://localhost:${env.PORT} (${env.NODE_ENV})`,
    );
    logger.info(`CORS diizinkan untuk: ${env.FRONTEND_URL}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Menerima ${signal}, menutup server...`);
    server.close(async () => {
      try {
        await closePool();
        logger.info('Pool database ditutup. Keluar.');
      } catch (err) {
        logger.error({ err }, 'Error saat menutup pool');
      }
      process.exit(0);
    });

    // Paksa keluar bila tidak selesai dalam 10 detik.
    setTimeout(() => {
      logger.error('Shutdown timeout, keluar paksa');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });
}

main().catch((err) => {
  logger.fatal({ err }, 'Gagal menjalankan server');
  process.exit(1);
});
