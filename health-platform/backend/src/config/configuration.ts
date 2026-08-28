export interface AppConfiguration {
  env: string;
  port: number;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtl: string;
    adminSecret: string;
    adminTtl: string;
  };
  encryptionKey: string;
  corsOrigins: string[];
  redis: { host: string; port: number };
  push: { provider: string; fcmProjectId: string };
}

export default (): AppConfiguration => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '900s',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
    adminSecret: process.env.JWT_ADMIN_SECRET ?? 'dev-admin-secret',
    adminTtl: process.env.JWT_ADMIN_TTL ?? '8h',
  },
  encryptionKey: process.env.ENCRYPTION_KEY ?? '',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3001')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  push: {
    provider: process.env.PUSH_PROVIDER ?? 'noop', // noop | fcm
    fcmProjectId: process.env.FCM_PROJECT_ID ?? '',
  },
});
