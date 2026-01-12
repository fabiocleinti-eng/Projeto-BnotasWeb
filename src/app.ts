import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import routes from './routes';
import { errorHandler } from './middlewares/error';
import { knex } from './db/knex';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGINS }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', async (_req, res) => {
  try {
    await knex.raw('SELECT 1');
    res.json({ status: 'ok', db: 'up' });
  } catch (e) {
    res.status(500).json({ status: 'error', db: 'down' });
  }
});

app.use('/api', routes);

// Swagger (served inside routes at /docs and /docs.json)

app.use(errorHandler);

export default app;

