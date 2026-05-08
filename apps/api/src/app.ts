import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

import authRouter from "./routes/auth";
import productsRouter from "./routes/products";
import usersRouter from "./routes/users";
import adminProductsRouter from "./routes/admin/products";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000" }));
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
app.use("/v1/admin/products", adminProductsRouter);

export default app;
