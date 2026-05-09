import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { signAccess, signRefresh, verifyRefresh } from "../lib/jwt";
import { requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();

const OTP_TTL = 120; // seconds
const DEV_OTP = "1234"; // used when SMS_API_KEY is not set

// POST /auth/otp/send
router.post("/otp/send", async (req, res) => {
  const result = z.object({ phone: z.string().min(8) }).safeParse(req.body);
  if (!result.success) {
    res
      .status(422)
      .json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Утасны дугаар буруу" },
      });
    return;
  }
  const { phone } = result.data;

  const otp = process.env.SMS_API_KEY
    ? Math.floor(1000 + Math.random() * 9000).toString()
    : DEV_OTP;

  await redis.set(`otp:${phone}`, otp, { EX: OTP_TTL });

  if (process.env.SMS_API_KEY) {
    // TODO: send real SMS via Mongolian SMS API
  } else {
    console.log(`[DEV] OTP for ${phone}: ${otp}`);
  }

  res.json({ success: true, data: { expires_in: OTP_TTL } });
});

// POST /auth/otp/verify
router.post("/otp/verify", async (req, res) => {
  const result = z
    .object({ phone: z.string().min(8), otp: z.string().length(4) })
    .safeParse(req.body);
  if (!result.success) {
    res
      .status(422)
      .json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Өгөгдөл буруу" },
      });
    return;
  }
  const { phone, otp } = result.data;

  const stored = await redis.get(`otp:${phone}`);
  if (!stored || stored !== otp) {
    res
      .status(400)
      .json({
        success: false,
        error: { code: "OTP_INVALID", message: "OTP буруу эсвэл хугацаа дууссан" },
      });
    return;
  }

  await redis.del(`otp:${phone}`);

  let user = await prisma.user.findUnique({ where: { phone } });
  const isNew = !user;

  if (!user) {
    user = await prisma.user.create({ data: { phone, name: "", role: "customer" } });
  }

  const payload = { sub: user.id, role: user.role, phone: user.phone };
  const accessToken = signAccess(payload);
  const refreshToken = signRefresh(payload);

  await redis.set(`refresh:${user.id}`, refreshToken, { EX: 60 * 60 * 24 * 30 });

  res.json({
    success: true,
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      is_new: isNew,
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role },
    },
  });
});

// POST /auth/refresh
router.post("/refresh", async (req, res) => {
  const result = z.object({ refresh_token: z.string() }).safeParse(req.body);
  if (!result.success) {
    res
      .status(422)
      .json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Token шаардлагатай" },
      });
    return;
  }

  try {
    const payload = verifyRefresh(result.data.refresh_token);
    const stored = await redis.get(`refresh:${payload.sub}`);
    if (!stored || stored !== result.data.refresh_token) {
      res
        .status(401)
        .json({
          success: false,
          error: { code: "TOKEN_INVALID", message: "Token хүчингүй" },
        });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      res
        .status(401)
        .json({
          success: false,
          error: { code: "USER_NOT_FOUND", message: "Хэрэглэгч олдсонгүй" },
        });
      return;
    }

    const newPayload = { sub: user.id, role: user.role, phone: user.phone };
    const accessToken = signAccess(newPayload);
    const refreshToken = signRefresh(newPayload);

    await redis.set(`refresh:${user.id}`, refreshToken, { EX: 60 * 60 * 24 * 30 });

    res.json({
      success: true,
      data: { access_token: accessToken, refresh_token: refreshToken },
    });
  } catch {
    res
      .status(401)
      .json({
        success: false,
        error: { code: "TOKEN_INVALID", message: "Token хүчингүй" },
      });
  }
});

// POST /auth/logout
router.post("/logout", requireAuth(), async (req: AuthRequest, res) => {
  await redis.del(`refresh:${req.user!.sub}`);
  res.json({ success: true, data: null });
});

// POST /auth/admin/login
router.post("/admin/login", async (req, res) => {
  const result = z
    .object({ email: z.string().email(), password: z.string().min(6) })
    .safeParse(req.body);
  if (!result.success) {
    res
      .status(422)
      .json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Өгөгдөл буруу" },
      });
    return;
  }
  const { email, password } = result.data;

  const user = await prisma.user.findFirst({ where: { email, role: "admin" } });
  if (!user) {
    res
      .status(401)
      .json({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Имэйл эсвэл нууц үг буруу" },
      });
    return;
  }

  // In dev: admin password is stored in env or default to "admin1234"
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin1234";
  if (password !== adminPassword) {
    res
      .status(401)
      .json({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Имэйл эсвэл нууц үг буруу" },
      });
    return;
  }

  const payload = { sub: user.id, role: user.role, phone: user.phone };
  const accessToken = signAccess(payload);
  const refreshToken = signRefresh(payload);

  await redis.set(`refresh:${user.id}`, refreshToken, { EX: 60 * 60 * 24 * 30 });

  res.json({
    success: true,
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    },
  });
});

export default router;
