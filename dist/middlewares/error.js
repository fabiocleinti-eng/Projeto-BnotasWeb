"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.ApiError = void 0;
class ApiError extends Error {
    constructor(status, message, code = 'ERROR', details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }
}
exports.ApiError = ApiError;
const errorHandler = (err, _req, res, _next) => {
    if (err instanceof ApiError) {
        return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    }
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Algo inesperado aconteceu.' } });
};
exports.errorHandler = errorHandler;
