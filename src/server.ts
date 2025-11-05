import 'dotenv/config';
import { createServer } from 'http';
import app from './app';
import { env } from './config/env';

const server = createServer(app);
const port = env.PORT;

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`BnotasWeb API listening on http://localhost:${port}`);
});

