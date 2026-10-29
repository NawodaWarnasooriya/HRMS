
import { Router } from "express";
import { Prisma } from "@prisma/client";

import prisma from "../config/prisma";

const router = Router();

// Helper: Handle duplicate department names
const isDuplicateNameError = (error: unknown): boolean => {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
};

// Helper: Validate department ID
const isValidId = (id: number): boolean => {
  return Number.isInteger(id) && id > 0;
};

// GET: Retrieve all departments
router.get("/", async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return res.status(200).json({
      message: "Departments retrieved successfully",
      data: departments,
    });
  } catch (error) {
    console.error("Error retrieving departments:", error);

    return res.status(500).json({
      message: "Failed to retrieve departments",
    });
  }
});

// GET: Retrieve a department by ID
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid department ID",
      });
    }

    const department = await prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    return res.status(200).json({
      message: "Department retrieved successfully",
      data: department,
    });
  } catch (error) {
    console.error("Error retrieving department:", error);

    return res.status(500).json({
      message: "Failed to retrieve department",
    });
  }
});
// POST: Create a new department
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Department name is required",
      });
    }

    const department = await prisma.department.create({
      data: {
        name: name.trim(),
      },
    });

    return res.status(201).json({
      message: "Department created successfully",
      data: department,
    });
  } catch (error) {
    console.error("Error creating department:", error);

    if (isDuplicateNameError(error)) {
      return res.status(409).json({
        message: "A department with this name already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to create department",
    });
  }
});

// PUT: Update an existing department
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid department ID",
      });
    }

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Department name is required",
      });
    }

    const existingDepartment = await prisma.department.findUnique({
      where: { id },
    });

    if (!existingDepartment) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        name: name.trim(),
      },
    });

    return res.status(200).json({
      message: "Department updated successfully",
      data: department,
    });
  } catch (error) {
    console.error("Error updating department:", error);

    if (isDuplicateNameError(error)) {
      return res.status(409).json({
        message: "A department with this name already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to update department",
    });
  }
});

// DELETE: Delete an existing department
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid department ID",
      });
    }

    const existingDepartment = await prisma.department.findUnique({
      where: { id },
    });

    if (!existingDepartment) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    await prisma.department.delete({
      where: { id },
    });

    return res.status(200).json({
      message: "Department deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting department:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return res.status(409).json({
        message: "Cannot delete this department because it is referenced by other records",
      });
    }

    return res.status(500).json({
      message: "Failed to delete department",
    });
  }
});

export default router;