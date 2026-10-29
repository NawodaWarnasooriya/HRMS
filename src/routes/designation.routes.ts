
import { Router } from "express";
import { Prisma } from "@prisma/client";

import prisma from "../config/prisma";

const router = Router();

const isValidId = (id: number): boolean => {
  return Number.isInteger(id) && id > 0;
};

const isValidStatus = (status: unknown): boolean => {
  return status === "ACTIVE" || status === "INACTIVE";
};

const isDuplicateNameError = (error: unknown): boolean => {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
};

// GET: Retrieve all designations
router.get("/", async (req, res) => {
  try {
    const designations = await prisma.designation.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return res.status(200).json({
      message: "Designations retrieved successfully",
      data: designations,
    });
  } catch (error) {
    console.error("Error retrieving designations:", error);

    return res.status(500).json({
      message: "Failed to retrieve designations",
    });
  }
});

// GET: Retrieve a designation by ID
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Please provide a valid designation ID",
      });
    }

    const designation = await prisma.designation.findUnique({
      where: { id },
    });

    if (!designation) {
      return res.status(404).json({
        message: "Designation not found",
      });
    }

    return res.status(200).json({
      message: "Designation retrieved successfully",
      data: designation,
    });
  } catch (error) {
    console.error("Error retrieving designation:", error);

    return res.status(500).json({
      message: "Failed to retrieve designation",
    });
  }
});

// POST: Create a new designation
router.post("/", async (req, res) => {
  try {
    const { name, description, status } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Designation name is required",
      });
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        message: "Description must be a string",
      });
    }

    if (status !== undefined && !isValidStatus(status)) {
      return res.status(400).json({
        message: "Status must be ACTIVE or INACTIVE",
      });
    }

    const designation = await prisma.designation.create({
      data: {
        name: name.trim(),
        description:
          typeof description === "string"
            ? description.trim() || null
            : null,
        ...(status !== undefined ? { status } : {}),
      },
    });

    return res.status(201).json({
      message: "Designation created successfully",
      data: designation,
    });
  } catch (error) {
    console.error("Error creating designation:", error);

    if (isDuplicateNameError(error)) {
      return res.status(409).json({
        message: "A designation with this name already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to create designation",
    });
  }
});

// PUT: Update an existing designation
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, description, status } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Please provide a valid designation ID",
      });
    }

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Designation name is required",
      });
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        message: "Description must be a string",
      });
    }

    if (status !== undefined && !isValidStatus(status)) {
      return res.status(400).json({
        message: "Status must be ACTIVE or INACTIVE",
      });
    }

    const existingDesignation = await prisma.designation.findUnique({
      where: { id },
    });

    if (!existingDesignation) {
      return res.status(404).json({
        message: "Designation not found",
      });
    }

    const updatedDesignation = await prisma.designation.update({
      where: { id },
      data: {
        name: name.trim(),
        ...(description !== undefined
          ? {
              description:
                typeof description === "string"
                  ? description.trim() || null
                  : null,
            }
          : {}),
        ...(status !== undefined ? { status } : {}),
      },
    });

    return res.status(200).json({
      message: "Designation updated successfully",
      data: updatedDesignation,
    });
  } catch (error) {
    console.error("Error updating designation:", error);

    if (isDuplicateNameError(error)) {
      return res.status(409).json({
        message: "A designation with this name already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to update designation",
    });
  }
});

// DELETE: Delete an existing designation
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Please provide a valid designation ID",
      });
    }

    const existingDesignation = await prisma.designation.findUnique({
      where: { id },
    });

    if (!existingDesignation) {
      return res.status(404).json({
        message: "Designation not found",
      });
    }

    const employeeCount = await prisma.employee.count({
      where: { designationId: id },
    });

    if (employeeCount > 0) {
      return res.status(409).json({
        message:
          "Cannot delete this designation because employees are assigned to it",
      });
    }

    await prisma.designation.delete({
      where: { id },
    });

    return res.status(200).json({
      message: "Designation deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting designation:", error);

    return res.status(500).json({
      message: "Failed to delete designation",
    });
  }
});

export default router;
