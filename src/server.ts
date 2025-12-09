import 'dotenv/config';
import { createServer } from 'http';
import app from './app';
import { env } from './config/env';
import { startCronJobs } from './modules/anotacao/anotacao.cron'; // <--- IMPORTAR

const server = createServer(app);
const port = env.PORT;

// Inicia os agendamentos
startCronJobs(); // <--- INICIAR AQUI

server.listen(port, () => {
  console.log(`BnotasWeb API listening on http://localhost:${port}`);
});