declare module 'express-mysql-session' {
  import type { Store } from 'express-session';

  interface MySQLSessionOptions {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    schema?: {
      tableName?: string;
      columnNames?: {
        session_id?: string;
        expires?: string;
        data?: string;
      };
    };
    createDatabaseTable?: boolean;
    clearExpired?: boolean;
    checkExpirationInterval?: number;
    expiration?: number;
    url?: string;
  }

  class MySQLStore extends Store {
    constructor(options?: MySQLSessionOptions, connection?: unknown);
    close(): Promise<void>;
  }

  export default MySQLStore;
}
