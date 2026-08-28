"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const http_1 = require("http");
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const anotacao_cron_1 = require("./modules/anotacao/anotacao.cron"); // <--- IMPORTAR
const server = (0, http_1.createServer)(app_1.default);
const port = env_1.env.PORT;
// Inicia os agendamentos (desligado nos testes automatizados, para não enviar e-mails de verdade)
if (process.env.DISABLE_CRON !== 'true') {
    (0, anotacao_cron_1.startCronJobs)();
}
server.listen(port, () => {
    console.log(`BnotasWeb API listening on http://localhost:${port}`);
});
