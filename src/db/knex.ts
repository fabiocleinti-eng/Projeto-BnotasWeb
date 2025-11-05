import Knex from 'knex';
import { env } from '../config/env';

export const knex = Knex({
  client: 'mysql2',
  connection: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    dateStrings: true
  },
  pool: {
    min: 0,
    max: 10,
    idleTimeoutMillis: 30000
  }
});

