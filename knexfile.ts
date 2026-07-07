import 'dotenv/config';
import type { Knex } from 'knex';

// Configuração usada pelo CLI do Knex (npx knex migrate:latest)
const config: Knex.Config = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bnotasweb'
  },
  migrations: {
    directory: './migrations',
    extension: 'ts'
  }
};

export default config;
