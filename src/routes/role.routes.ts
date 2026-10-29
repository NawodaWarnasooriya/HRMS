import { Router, Request, Response } from "express";
import prisma from "../config/prisma";
import { authMiddleware } from "../middleware/auth.middleware";
import { permissionMiddleware } from "../middleware/permission.middleware";

const router = Router();

// GET all roles - Requires ROLE_READ permission
router.get(
  "/",
  authMiddleware,
  permissionMiddleware("ROLE_READ"),
  async (_req: Request, res: Response) => {
    try {
      const roles = await prisma.role.findMany({
        include: {
          permissions: true,
        },
        orderBy: {
          id: "asc",
        },
      });

      return res.status(200).json({
        message: "Roles retrieved successfully.",
        data: roles,
      });
    } catch (error) {
      console.error("Get roles error:", error);

      return res.status(500).json({
        message: "Failed to retrieve roles.",
      });
    }
  }
);

// CREATE role - Requires ROLE_CREATE permission
router.post(
  "/",
  authMiddleware,
  permissionMiddleware("ROLE_CREATE"),
  async (req: Request, res: Response) => {
    try {
      const name =
        typeof req.body?.name === "string" ? req.body.name.trim() : "";

      if (!name) {
        return res.status(400).json({
          message: "Role name is required.",
        });
      }

      const existingRole = await prisma.role.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
      });

      if (existingRole) {
        return res.status(409).json({
          message: "This role already exists.",
        });
      }

      const role = await prisma.role.create({
        data: {
          name,
        },
        include: {
          permissions: true,
        },
      });

      return res.status(201).json({
        message: "Role created successfully.",
        data: role,
      });
    } catch (error) {
      console.error("Create role error:", error);

      return res.status(500).json({
        message: "Failed to create role.",
      });
    }
  }
);

// UPDATE role - Requires ROLE_UPDATE permission
router.put(
  "/:id",
  authMiddleware,
  permissionMiddleware("ROLE_UPDATE"),
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({
          message: "Invalid role ID.",
        });
      }

      const name =
        typeof req.body?.name === "string" ? req.body.name.trim() : "";

      if (!name) {
        return res.status(400).json({
          message: "Role name is required.",
        });
      }

      const existingRole = await prisma.role.findFirst({
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

      if (existingRole) {
        return res.status(409).json({
          message: "Another role already uses this name.",
        });
      }

      const role = await prisma.role.update({
        where: { id },
        data: { name },
        include: {
          permissions: true,
        },
      });

      return res.status(200).json({
        message: "Role updated successfully.",
        data: role,
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2025"
      ) {
        return res.status(404).json({
          message: "Role not found.",
        });
      }

      console.error("Update role error:", error);

      return res.status(500).json({
        message: "Failed to update role.",
      });
    }
  }
);

// DELETE role - Requires ROLE_DELETE permission
router.delete(
  "/:id",
  authMiddleware,
  permissionMiddleware("ROLE_DELETE"),
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({
          message: "Invalid role ID.",
        });
      }

      await prisma.role.delete({
        where: { id },
      });

      return res.status(200).json({
        message: "Role deleted successfully.",
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2025"
      ) {
        return res.status(404).json({
          message: "Role not found.",
        });
      }

      console.error("Delete role error:", error);

      return res.status(500).json({
        message: "Failed to delete role.",
      });
    }
  }
);

// ASSIGN permissions to a role - Requires ROLE_PERMISSION_ASSIGN permission
router.put(
  "/:id/permissions",
  authMiddleware,
  permissionMiddleware("ROLE_PERMISSION_ASSIGN"),
  async (req: Request, res: Response) => {
    try {
      const roleId = Number(req.params.id);
      const permissionIds = req.body?.permissionIds;

      if (!Number.isSafeInteger(roleId) || roleId <= 0) {
        return res.status(400).json({
          message: "Invalid role ID.",
        });
      }

      if (
        !Array.isArray(permissionIds) ||
        !permissionIds.every(
          (id: unknown) =>
            typeof id === "number" &&
            Number.isSafeInteger(id) &&
            id > 0
        )
      ) {
        return res.status(400).json({
          message: "permissionIds must be an array of positive integers.",
        });
      }

      const uniquePermissionIds = [...new Set<number>(permissionIds)];

      const roleExists = await prisma.role.findUnique({
        where: { id: roleId },
      });

      if (!roleExists) {
        return res.status(404).json({
          message: "Role not found.",
        });
      }

      const permissions = await prisma.permission.findMany({
        where: {
          id: {
            in: uniquePermissionIds,
          },
        },
        select: {
          id: true,
        },
      });

      if (permissions.length !== uniquePermissionIds.length) {
        return res.status(400).json({
          message: "One or more permission IDs do not exist.",
        });
      }

      const updatedRole = await prisma.role.update({
        where: { id: roleId },
        data: {
          permissions: {
            set: uniquePermissionIds.map((id) => ({ id })),
          },
        },
        include: {
          permissions: true,
        },
      });

      return res.status(200).json({
        message: "Permissions assigned to role successfully.",
        data: updatedRole,
      });
    } catch (error) {
      console.error("Assign permissions error:", error);

      return res.status(500).json({
        message: "Failed to assign permissions.",
      });
    }
  }
);

export default router;