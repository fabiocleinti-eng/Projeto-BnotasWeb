import 'dotenv/config';
import { createServer } from 'http';
import app from './app';
import { env } from './config/env';
import { startCronJobs } from './modules/anotacao/anotacao.cron'; // <--- IMPORTAR

const server = createServer(app);
const port = env.PORT;

// Inicia os agendamentos (desligado nos testes automatizados, para não enviar e-mails de verdade)
if (process.env.DISABLE_CRON !== 'true') {
  startCronJobs();
}

server.listen(port, () => {
  console.log(`BnotasWeb API listening on http://localhost:${port}`);
});