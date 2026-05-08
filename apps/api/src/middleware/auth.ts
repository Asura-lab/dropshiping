import type { Request, Response, NextFunction } from "express";
import { verifyAccess, type JwtPayload } from "../lib/jwt";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function requireAuth(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res
        .status(401)
        .json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Нэвтрэх шаардлагатай" },
        });
      return;
    }

    try {
      const payload = verifyAccess(header.slice(7));
      if (roles.length > 0 && !roles.includes(payload.role)) {
        res
          .status(403)
          .json({
            success: false,
            error: { code: "FORBIDDEN", message: "Эрх хүрэлцэхгүй" },
          });
        return;
      }
      req.user = payload;
      next();
    } catch {
      res
        .status(401)
        .json({
          success: false,
          error: { code: "TOKEN_INVALID", message: "Token хүчингүй" },
        });
    }
  };
}
