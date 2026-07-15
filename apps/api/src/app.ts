import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import router from './routes/index.js';
import { errorHandler, notFound } from './middleware/error.js';
import { env } from './config/env.js';
export const createApp = () => {
  const app = express();
  app.use(pinoHttp());
  const allowedOrigins = (env.CORS_ORIGIN || '').split(',').map((o: string) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.get('/health', (_req, res) =>
    res.json({ success: true, message: 'Healthy', data: { status: 'ok' } }),
  );
  const swagger = swaggerJsdoc({
    definition: {
      openapi: '3.0.0',
      info: { title: 'BugForge API', version: '1.0.0' },
      components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } } },
    },
    apis: ['./src/routes/*.ts', './dist/routes/*.js'],
  });
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swagger));
  app.use('/api/v1', router);
  app.use(notFound);
  app.use(errorHandler);
  return app;
};
