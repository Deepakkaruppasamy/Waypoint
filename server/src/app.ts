import cors from 'cors';
import express, { Express } from 'express';
import { delay } from './middleware/delay';
import { errorHandler, routeNotFound } from './middleware/error-handler';
import { authRoutes } from './routes/auth.routes';
import { recordRoutes } from './routes/records.routes';
import { userRoutes } from './routes/users.routes';
import { DataStore } from './storage';

/** Builds the Express application. Kept separate from index.ts so it can be tested without a port. */
export function createApp(store: DataStore): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use('/api', delay); // every API route honours ?delay=<milliseconds>

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', storage: store.kind, time: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes(store));
  app.use('/api/records', recordRoutes(store));
  app.use('/api/users', userRoutes(store));

  app.use(routeNotFound);
  app.use(errorHandler);
  return app;
}
