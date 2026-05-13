import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

import authRouter from "./routes/auth";
import productsRouter from "./routes/products";
import usersRouter from "./routes/users";
import ordersRouter from "./routes/orders";
import paymentsRouter from "./routes/payments";
import deliverySlotsRouter from "./routes/delivery-slots";
import adminProductsRouter from "./routes/admin/products";
import adminOrdersRouter from "./routes/admin/orders";
import adminDeliverySlotsRouter from "./routes/admin/delivery-slots";
import adminUploadRouter from "./routes/admin/upload";
import adminSourceOrdersRouter from "./routes/admin/source-orders";
import adminReportsRouter from "./routes/admin/reports";
import driverRouter from "./routes/driver";
import sourceOrdersWebhookRouter from "./routes/internal/source-orders-webhook";

const app = express();

app.use(helmet());
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((s) => s.trim())
  : ["http://localhost:3000", "http://localhost:3500"];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/v1/auth", authRouter);
app.use("/v1/products", productsRouter);
app.use("/v1/users", usersRouter);
app.use("/v1/orders", ordersRouter);
app.use("/v1/payments", paymentsRouter);
app.use("/v1/delivery-slots", deliverySlotsRouter);
app.use("/v1/admin/products", adminProductsRouter);
app.use("/v1/admin/orders", adminOrdersRouter);
app.use("/v1/admin/delivery-slots", adminDeliverySlotsRouter);
app.use("/v1/admin/upload", adminUploadRouter);
app.use("/v1/admin/source-orders", adminSourceOrdersRouter);
app.use("/v1/admin/reports", adminReportsRouter);
app.use("/v1/driver", driverRouter);
app.use("/v1/internal/source-orders/webhook", sourceOrdersWebhookRouter);

export default app;
