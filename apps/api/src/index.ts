import "dotenv/config";
import app from "./app";
import { connectRedis } from "./lib/redis";
import { startSmsWorker } from "./workers/sms.worker";

const PORT = process.env.PORT ?? 4000;

async function main() {
  await connectRedis();
  startSmsWorker();
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
