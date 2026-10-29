import { Router, Request, Response } from "express";
import prisma from "../config/prisma";
import { authMiddleware } from "../middleware/auth.middleware";
import { permissionMiddleware } from "../middleware/permission.middleware";

const router = Router();

// GET all permissions - Requires PERMISSION_READ permission
router.get(
  "/",
  authMiddleware,
  permissionMiddleware("PERMISSION_READ"),
  async (_req: Request, res: Response) => {
    try {
      const permissions = await prisma.permission.findMany({
        include: {
          roles: true,
        },
        orderBy: {
          id: "asc",
        },
      });

      return res.status(200).json({
        message: "Permissions retrieved successfully.",
        data: permissions,
      });
    } catch (error) {
      console.error("Get permissions error:", error);

      return res.status(500).json({
        message: "Failed to retrieve permissions.",
      });
    }
  }
);

// CREATE permission - Requires PERMISSION_CREATE permission
router.post(
  "/",
  authMiddleware,
  permissionMiddleware("PERMISSION_CREATE"),
  async (req: Request, res: Response) => {
    try {
      const name =
        typeof req.body?.name === "string" ? req.body.name.trim() : "";

      if (!name) {
        return res.status(400).json({
          message: "Permission name is required.",
        });
      }

      const existingPermission = await prisma.permission.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
      });

      if (existingPermission) {
        return res.status(409).json({
          message: "This permission already exists.",
        });
      }

      const permission = await prisma.permission.create({
        data: {
          name,
        },
        include: {
          roles: true,
        },
      });

      return res.status(201).json({
        message: "Permission created successfully.",
        data: permission,
      });
    } catch (error) {
      console.error("Create permission error:", error);

      return res.status(500).json({
        message: "Failed to create permission.",
      });
    }
  }
);

// UPDATE permission - Requires PERMISSION_UPDATE permission
router.put(
  "/:id",
  authMiddleware,
  permissionMiddleware("PERMISSION_UPDATE"),
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({
          message: "Invalid permission ID.",
        });
      }

      const name =
        typeof req.body?.name === "string" ? req.body.name.trim() : "";

      if (!name) {
        return res.status(400).json({
          message: "Permission name is required.",
        });
      }

      const existingPermission = await prisma.permission.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
          NOT: {
            id,
          },
        },
      });

      if (existingPermission) {
        return res.status(409).json({
          message: "Another permission already uses this name.",
        });
      }

      const permission = await prisma.permission.update({
        where: { id },
        data: { name },
        include: {
          roles: true,
        },
      });

      return res.status(200).json({
        message: "Permission updated successfully.",
        data: permission,
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2025"
      ) {
        return res.status(404).json({
          message: "Permission not found.",
        });
      }

      console.error("Update permission error:", error);

      return res.status(500).json({
        message: "Failed to update permission.",
      });
    }
  }
);

// DELETE permission - Requires PERMISSION_DELETE permission
router.delete(
  "/:id",
  authMiddleware,
  permissionMiddleware("PERMISSION_DELETE"),
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({
          message: "Invalid permission ID.",
        });
      }

      await prisma.permission.delete({
        where: { id },
      });

      return res.status(200).json({
        message: "Permission deleted successfully.",
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2025"
      ) {
        return res.status(404).json({
          message: "Permission not found.",
        });
      }

      console.error("Delete permission error:", error);

      return res.status(500).json({
        message: "Failed to delete permission.",
      });
    }
  }
);

export default router;