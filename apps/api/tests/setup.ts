// Set required env vars for test environment before any modules import env.ts
process.env.MONGO_URI = 'mongodb://localhost:27017/bugforge-test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-characters-long';
process.env.ACCESS_TOKEN_TTL = '15m';
process.env.REFRESH_TOKEN_TTL = '7d';
process.env.API_PORT = '4000';
process.env.CORS_ORIGIN = 'http://localhost:3000';
