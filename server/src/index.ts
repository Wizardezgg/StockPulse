import 'dotenv/config';
import { connectDatabase } from './config/db.js';
import { createApp } from './app.js';

const PORT = Number(process.env.PORT) || 5000;

async function start() {
  const mode = await connectDatabase();
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[StockPulse API] Running on http://localhost:${PORT} (mode: ${mode})`);
  });
}

start();
