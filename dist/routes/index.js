"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const usuario_routes_1 = __importDefault(require("./usuario.routes"));
const anotacao_routes_1 = __importDefault(require("./anotacao.routes"));
const subscription_routes_1 = __importDefault(require("./subscription.routes"));
const payment_routes_1 = __importDefault(require("./payment.routes"));
const swaggerUi = __importStar(require("swagger-ui-express"));
const openapi_1 = require("../docs/openapi");
const router = (0, express_1.Router)();
router.use(usuario_routes_1.default);
router.use(anotacao_routes_1.default);
router.use(subscription_routes_1.default);
router.use(payment_routes_1.default);
router.get('/docs.json', (_req, res) => res.json(openapi_1.openapiSpec));
router.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi_1.openapiSpec));
exports.default = router;
