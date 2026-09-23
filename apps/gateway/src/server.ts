import 'dotenv/config';
import { createApp } from './app.js';

const PORT = process.env.GATEWAY_PORT ? Number(process.env.GATEWAY_PORT) : 4000;

const app = createApp();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[gateway] listening on port ${PORT}`);
});
