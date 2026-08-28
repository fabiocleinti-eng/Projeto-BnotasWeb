"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const error_1 = require("./error");
const validate = (schema) => (req, _res, next) => {
    const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });
    if (!result.success) {
        const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
        return next(new error_1.ApiError(400, 'Erro de validação', 'VALIDATION_ERROR', details));
    }
    next();
};
exports.validate = validate;
