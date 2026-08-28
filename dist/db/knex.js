"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.knex = void 0;
const knex_1 = __importDefault(require("knex"));
const env_1 = require("../config/env");
exports.knex = (0, knex_1.default)({
    client: 'mysql2',
    connection: {
        host: env_1.env.DB_HOST,
        port: env_1.env.DB_PORT,
        user: env_1.env.DB_USER,
        password: env_1.env.DB_PASSWORD,
        database: env_1.env.DB_NAME,
        dateStrings: true
    },
    pool: {
        min: 0,
        max: 2, // Reduzido para evitar travamentos em desenvolvimento
        idleTimeoutMillis: 1000
    }
});
