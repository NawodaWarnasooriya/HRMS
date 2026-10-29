
import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";
import prisma from "../config/prisma";

const permissionMiddleware = (...requiredPermissions: string[]) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: "Authentication required.",
        });
      }

      if (requiredPermissions.length === 0) {
        return res.status(500).json({
          message: "No permissions configured for this route.",
        });
      }

      const userId = req.user.userId;

      if (!Number.isSafeInteger(userId) || userId <= 0) {
        return res.status(401).json({
          message: "Invalid authentication information.",
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          role: true,
          status: true,
        },
      });

      if (!user || user.status !== "ACTIVE") {
        return res.status(403).json({
          message: "User account is inactive or unavailable.",
        });
      }

      const role = await prisma.role.findFirst({
        where: {
          name: {
            equals: user.role,
            mode: "insensitive",
          },
          status: "ACTIVE",
        },
        include: {
          permissions: {
            where: {
              status: "ACTIVE",
            },
            select: {
              name: true,
            },
          },
        },
      });

      if (!role) {
        return res.status(403).json({
          message: "No active role is assigned to this user.",
        });
      }

      const userPermissions = role.permissions.map((permission) =>
        permission.name.trim().toUpperCase()
      );

      const hasRequiredPermissions = requiredPermissions.every(
        (permission) =>
          userPermissions.includes(permission.trim().toUpperCase())
      );

      if (!hasRequiredPermissions) {
        return res.status(403).json({
          message: "Access denied. Required permission is missing.",
        });
      }

      return next();
    } catch (error) {
      console.error("Permission middleware error:", error);

      return res.status(500).json({
        message: "Failed to verify permissions.",
      });
    }
  };
};

export { permissionMiddleware };

