
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
  };
}

const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Access denied. Token is required.",
      });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;

    if (!token || !secret) {
      return res.status(401).json({
        message: "Invalid token or missing secret.",
      });
    }

    const decoded = jwt.verify(token, secret);

    if (typeof decoded === "string") {
      return res.status(401).json({
        message: "Invalid token.",
      });
    }

    req.user = {
      userId: Number(decoded.userId),
      email: String(decoded.email),
      role: String(decoded.role),
    };

    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
};

export { authMiddleware, AuthRequest };

