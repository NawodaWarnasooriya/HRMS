import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Prisma } from "@prisma/client";

import prisma from "../config/prisma";
import { authMiddleware } from "../middleware/auth.middleware";
import { roleMiddleware } from "../middleware/role.middleware";
import { permissionMiddleware } from "../middleware/permission.middleware";

const router = Router();

// --------------------------------------------------
// Helper Functions
// --------------------------------------------------

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidEmail = (email: string): boolean => {
  return emailPattern.test(email);
};

const isValidId = (id: number): boolean => {
  return Number.isSafeInteger(id) && id > 0;
};

const isValidStatus = (status: unknown): boolean => {
  return (
    status === "ACTIVE" ||
    status === "INACTIVE" ||
    status === "SUSPENDED"
  );
};

const isDuplicateEmailError = (error: unknown): boolean => {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
};

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  departmentId: true,
  createdAt: true,
  updatedAt: true,
};

// --------------------------------------------------
// GET: Retrieve All Users
// Permission Required: USER_READ
// --------------------------------------------------

router.get(
  "/",
  authMiddleware,
  permissionMiddleware("USER_READ"),
  async (req: Request, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        select: publicUserSelect,
        orderBy: {
          id: "asc",
        },
      });

      return res.status(200).json({
        message: "Users retrieved successfully",
        data: users,
      });
    } catch (error) {
      console.error("Error retrieving users:", error);

      return res.status(500).json({
        message: "Failed to retrieve users",
      });
    }
  }
);

// --------------------------------------------------
// POST: Public User Registration
// --------------------------------------------------

router.post(
  "/register",
  async (req: Request, res: Response) => {
    try {
      const { name, email, password } = req.body;

      if (
        typeof name !== "string" ||
        !name.trim() ||
        typeof email !== "string" ||
        !email.trim() ||
        typeof password !== "string" ||
        !password
      ) {
        return res.status(400).json({
          message: "Name, email and password are required",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({
          message: "Please provide a valid email address",
        });
      }

      if (name.trim().length > 100) {
        return res.status(400).json({
          message: "Name must not exceed 100 characters",
        });
      }

      if (password.length < 8 || password.length > 72) {
        return res.status(400).json({
          message: "Password must be between 8 and 72 characters",
        });
      }

      const existingUser = await prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

      if (existingUser) {
        return res.status(409).json({
          message: "Email already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          password: hashedPassword,
          role: "EMPLOYEE",
          status: "ACTIVE",
        },
        select: publicUserSelect,
      });

      return res.status(201).json({
        message: "Registration successful",
        data: user,
      });
    } catch (error) {
      console.error("Registration error:", error);

      if (isDuplicateEmailError(error)) {
        return res.status(409).json({
          message: "Email already exists",
        });
      }

      return res.status(500).json({
        message: "Registration failed",
      });
    }
  }
);

// --------------------------------------------------
// POST: Create User
// Permission Required: USER_CREATE
// --------------------------------------------------

router.post(
  "/",
  authMiddleware,
  permissionMiddleware("USER_CREATE"),
  async (req: Request, res: Response) => {
    try {
      const {
        name,
        email,
        password,
        role,
        status,
        departmentId,
      } = req.body;

      if (
        typeof name !== "string" ||
        !name.trim() ||
        typeof email !== "string" ||
        !email.trim() ||
        typeof password !== "string" ||
        !password
      ) {
        return res.status(400).json({
          message: "Name, email and password are required",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({
          message: "Please provide a valid email address",
        });
      }

      if (name.trim().length > 100) {
        return res.status(400).json({
          message: "Name must not exceed 100 characters",
        });
      }

      if (password.length < 8 || password.length > 72) {
        return res.status(400).json({
          message: "Password must be between 8 and 72 characters",
        });
      }

      if (
        role !== undefined &&
        (typeof role !== "string" || !role.trim())
      ) {
        return res.status(400).json({
          message: "Role must be a non-empty string",
        });
      }

      if (status !== undefined && !isValidStatus(status)) {
        return res.status(400).json({
          message: "Status must be ACTIVE, INACTIVE or SUSPENDED",
        });
      }

      let parsedDepartmentId: number | null = null;

      if (departmentId !== undefined && departmentId !== null) {
        parsedDepartmentId = Number(departmentId);

        if (!isValidId(parsedDepartmentId)) {
          return res.status(400).json({
            message: "Department ID must be a positive integer",
          });
        }

        const department = await prisma.department.findUnique({
          where: {
            id: parsedDepartmentId,
          },
        });

        if (!department) {
          return res.status(400).json({
            message: "Department not found",
          });
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          password: hashedPassword,
          role: role?.trim() || "EMPLOYEE",
          status: status ?? "ACTIVE",
          departmentId: parsedDepartmentId,
        },
        select: publicUserSelect,
      });

      return res.status(201).json({
        message: "User created successfully",
        data: user,
      });
    } catch (error) {
      console.error("Error creating user:", error);

      if (isDuplicateEmailError(error)) {
        return res.status(409).json({
          message: "Email already exists",
        });
      }

      return res.status(500).json({
        message: "Failed to create user",
      });
    }
  }
);

// --------------------------------------------------
// PUT: Update User
// Permission Required: USER_UPDATE
// --------------------------------------------------

router.put(
  "/:id",
  authMiddleware,
  permissionMiddleware("USER_UPDATE"),
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);

      const {
        name,
        email,
        password,
        role,
        status,
        departmentId,
      } = req.body;

      if (!isValidId(id)) {
        return res.status(400).json({
          message: "Please provide a valid user ID",
        });
      }

      const existingUser = await prisma.user.findUnique({
        where: {
          id,
        },
      });

      if (!existingUser) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const data: Prisma.UserUpdateInput = {};

      if (name !== undefined) {
        if (
          typeof name !== "string" ||
          !name.trim() ||
          name.trim().length > 100
        ) {
          return res.status(400).json({
            message: "Name must be a non-empty string of at most 100 characters",
          });
        }

        data.name = name.trim();
      }

      if (email !== undefined) {
        if (typeof email !== "string" || !email.trim()) {
          return res.status(400).json({
            message: "Email must be a non-empty string",
          });
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (!isValidEmail(normalizedEmail)) {
          return res.status(400).json({
            message: "Please provide a valid email address",
          });
        }

        data.email = normalizedEmail;
      }

      if (password !== undefined) {
        if (
          typeof password !== "string" ||
          password.length < 8 ||
          password.length > 72
        ) {
          return res.status(400).json({
            message: "Password must be between 8 and 72 characters",
          });
        }

        data.password = await bcrypt.hash(password, 10);
      }

      if (role !== undefined) {
        if (typeof role !== "string" || !role.trim()) {
          return res.status(400).json({
            message: "Role must be a non-empty string",
          });
        }

        data.role = role.trim();
      }

      if (status !== undefined) {
        if (!isValidStatus(status)) {
          return res.status(400).json({
            message: "Status must be ACTIVE, INACTIVE or SUSPENDED",
          });
        }

        data.status = status;
      }

      if (departmentId !== undefined) {
        if (departmentId === null) {
          data.department = {
            disconnect: true,
          };
        } else {
          const parsedDepartmentId = Number(departmentId);

          if (!isValidId(parsedDepartmentId)) {
            return res.status(400).json({
              message: "Department ID must be a positive integer",
            });
          }

          const department = await prisma.department.findUnique({
            where: {
              id: parsedDepartmentId,
            },
          });

          if (!department) {
            return res.status(400).json({
              message: "Department not found",
            });
          }

          data.department = {
            connect: {
              id: parsedDepartmentId,
            },
          };
        }
      }

      const updatedUser = await prisma.user.update({
        where: {
          id,
        },
        data,
        select: publicUserSelect,
      });

      return res.status(200).json({
        message: "User updated successfully",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Error updating user:", error);

      if (isDuplicateEmailError(error)) {
        return res.status(409).json({
          message: "Email already exists",
        });
      }

      return res.status(500).json({
        message: "Failed to update user",
      });
    }
  }
);

// --------------------------------------------------
// DELETE: Delete User
// Permission Required: USER_DELETE
// --------------------------------------------------

router.delete(
  "/:id",
  authMiddleware,
  permissionMiddleware("USER_DELETE"),
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);

      if (!isValidId(id)) {
        return res.status(400).json({
          message: "Please provide a valid user ID",
        });
      }

      const existingUser = await prisma.user.findUnique({
        where: {
          id,
        },
      });

      if (!existingUser) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      await prisma.user.delete({
        where: {
          id,
        },
      });

      return res.status(200).json({
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting user:", error);

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        return res.status(409).json({
          message: "Cannot delete this user because related records exist",
        });
      }

      return res.status(500).json({
        message: "Failed to delete user",
      });
    }
  }
);

// --------------------------------------------------
// POST: Forgot Password
// --------------------------------------------------

router.post(
  "/forgot-password",
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({
          message: "Email is required",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({
          message: "Please provide a valid email address",
        });
      }

      const genericMessage =
        "If an account exists with that email, password reset instructions will be sent.";

      const user = await prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

      if (!user) {
        return res.status(200).json({
          message: genericMessage,
        });
      }

      const resetToken = crypto.randomBytes(32).toString("hex");

      const hashedResetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      const resetTokenExpiry = new Date(
        Date.now() + 15 * 60 * 1000
      );

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          resetToken: hashedResetToken,
          resetTokenExpiry,
        },
      });

      // Development only. Send a reset link by email in production.
      if (process.env.NODE_ENV !== "production") {
        return res.status(200).json({
          message: genericMessage,
          developmentResetToken: resetToken,
          expiresInMinutes: 15,
        });
      }

      return res.status(200).json({
        message: genericMessage,
      });
    } catch (error) {
      console.error("Forgot password error:", error);

      return res.status(500).json({
        message: "Failed to process password reset request",
      });
    }
  }
);

// --------------------------------------------------
// POST: Reset Password
// --------------------------------------------------

router.post(
  "/reset-password",
  async (req: Request, res: Response) => {
    try {
      const { resetToken, newPassword } = req.body;

      if (
        typeof resetToken !== "string" ||
        !resetToken.trim() ||
        typeof newPassword !== "string" ||
        !newPassword
      ) {
        return res.status(400).json({
          message: "Reset token and new password are required",
        });
      }

      if (newPassword.length < 8 || newPassword.length > 72) {
        return res.status(400).json({
          message: "Password must be between 8 and 72 characters",
        });
      }

      const hashedResetToken = crypto
        .createHash("sha256")
        .update(resetToken.trim())
        .digest("hex");

      const user = await prisma.user.findFirst({
        where: {
          resetToken: hashedResetToken,
          resetTokenExpiry: {
            gt: new Date(),
          },
        },
      });

      if (!user) {
        return res.status(400).json({
          message: "Invalid or expired reset token",
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      return res.status(200).json({
        message: "Password reset successfully",
      });
    } catch (error) {
      console.error("Reset password error:", error);

      return res.status(500).json({
        message: "Failed to reset password",
      });
    }
  }
);

// --------------------------------------------------
// POST: Login
// --------------------------------------------------

router.post(
  "/login",
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (
        typeof email !== "string" ||
        !email.trim() ||
        typeof password !== "string" ||
        !password
      ) {
        return res.status(400).json({
          message: "Email and password are required",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({
          message: "Please provide a valid email address",
        });
      }

      const user = await prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

      if (!user) {
        return res.status(401).json({
          message: "Invalid email or password",
        });
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        user.password
      );

      if (!isPasswordValid) {
        return res.status(401).json({
          message: "Invalid email or password",
        });
      }

      if (user.status !== "ACTIVE") {
        return res.status(403).json({
          message: `Login denied. Your account is ${user.status.toLowerCase()}.`,
        });
      }

      const secret = process.env.JWT_SECRET;

      if (!secret) {
        console.error("JWT_SECRET is not configured");

        return res.status(500).json({
          message: "JWT secret is not configured",
        });
      }

      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        secret,
        {
          expiresIn: "1h",
        }
      );

      return res.status(200).json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      });
    } catch (error) {
      console.error("Login error:", error);

      return res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

// --------------------------------------------------
// GET: Protected User Profile
// --------------------------------------------------

router.get(
  "/profile",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : undefined;

      const secret = process.env.JWT_SECRET;

      if (!token || !secret) {
        return res.status(401).json({
          message: "Access token is required",
        });
      }

      const decoded = jwt.verify(token, secret);

      if (
        typeof decoded === "string" ||
        typeof decoded.userId !== "number" ||
        !isValidId(decoded.userId)
      ) {
        return res.status(401).json({
          message: "Invalid token",
        });
      }

      const user = await prisma.user.findUnique({
        where: {
          id: decoded.userId,
        },
        select: publicUserSelect,
      });

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (user.status !== "ACTIVE") {
        return res.status(403).json({
          message: "Access denied. Your account is not active.",
        });
      }

      return res.status(200).json({
        message: "Profile retrieved successfully",
        user,
      });
    } catch (error) {
      console.error("Profile error:", error);

      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }
  }
);

// --------------------------------------------------
// GET: Admin-Only Diagnostic Route
// --------------------------------------------------

router.get(
  "/admin-test",
  authMiddleware,
  roleMiddleware("ADMIN"),
  (req: Request, res: Response) => {
    return res.status(200).json({
      message: "Admin access granted",
    });
  }
);

// --------------------------------------------------
// POST: Logout
// --------------------------------------------------

router.post(
  "/logout",
  authMiddleware,
  (req: Request, res: Response) => {
    return res.status(200).json({
      message:
        "Logout successful. Please remove the token from the client.",
    });
  }
);

export default router;