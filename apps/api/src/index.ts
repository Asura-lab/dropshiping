import "dotenv/config";
import { execSync } from "child_process";
import path from "path";
import app from "./app";
import { connectRedis } from "./lib/redis";
import { startSmsWorker } from "./workers/sms.worker";
import { startExchangeRateWorker } from "./workers/exchange-rate.worker";
import { startScraperWorker } from "./workers/scraper.worker";
import { startSourceOrderWorker } from "./workers/source-order.worker";

const PORT = process.env.PORT ?? 4000;

async function main() {
  // Start HTTP server first so Railway health check passes immediately
  await new Promise<void>((resolve) => {
    app.listen(PORT, () => {
      console.log(`API server running on http://localhost:${PORT}`);
      resolve();
    });
  });

  // Run migrations after server is up (non-fatal so health check stays green)
  try {
    const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
    console.log("Running database migrations...");
    execSync(`npx prisma migrate deploy --schema=${schemaPath}`, { stdio: "inherit" });
    console.log("Migrations complete");
  } catch (err) {
    console.error("Migration failed:", err);
  }

  try {
    await connectRedis();
    startSmsWorker();
    startExchangeRateWorker();
    startScraperWorker();
    startSourceOrderWorker();
  } catch (err) {
    console.error("Redis unavailable, workers disabled:", err);
  }
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
