
import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

const roleMiddleware = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const userRole = req.user.role?.trim().toUpperCase();

    const normalizedAllowedRoles = allowedRoles.map((role) =>
      role.trim().toUpperCase()
    );

    if (!userRole || !normalizedAllowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: "Access denied. You do not have permission.",
      });
    }

    next();
  };
};

export { roleMiddleware };

