"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./config/env");
const routes_1 = __importDefault(require("./routes"));
const error_1 = require("./middlewares/error");
const rate_limit_1 = require("./middlewares/rate-limit");
const knex_1 = require("./db/knex");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: env_1.env.CORS_ORIGINS }));
app.use(express_1.default.json({ limit: '2mb' }));
app.use(express_1.default.urlencoded({ limit: '2mb', extended: true }));
app.use((0, morgan_1.default)(env_1.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.get('/health', async (_req, res) => {
    try {
        await knex_1.knex.raw('SELECT 1');
        res.json({ status: 'ok', db: 'up' });
    }
    catch (e) {
        res.status(500).json({ status: 'error', db: 'down' });
    }
});
app.use('/api', rate_limit_1.apiLimiter, routes_1.default);
// Swagger (served inside routes at /docs and /docs.json)
app.use(error_1.errorHandler);
exports.default = app;
