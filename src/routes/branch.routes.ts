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

// GET: Retrieve all branches
router.get("/", async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return res.status(200).json({
      message: "Branches retrieved successfully",
      data: branches,
    });
  } catch (error) {
    console.error("Error retrieving branches:", error);

    return res.status(500).json({
      message: "Failed to retrieve branches",
    });
  }
});

// GET: Retrieve a branch by ID
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Please provide a valid branch ID",
      });
    }

    const branch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!branch) {
      return res.status(404).json({
        message: "Branch not found",
      });
    }

    return res.status(200).json({
      message: "Branch retrieved successfully",
      data: branch,
    });
  } catch (error) {
    console.error("Error retrieving branch:", error);

    return res.status(500).json({
      message: "Failed to retrieve branch",
    });
  }
});

// POST: Create a new branch
router.post("/", async (req, res) => {
  try {
    const { name, address, phone, status } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Branch name is required",
      });
    }

    if (
      address !== undefined &&
      address !== null &&
      typeof address !== "string"
    ) {
      return res.status(400).json({
        message: "Address must be a string",
      });
    }

    if (
      phone !== undefined &&
      phone !== null &&
      typeof phone !== "string"
    ) {
      return res.status(400).json({
        message: "Phone must be a string",
      });
    }

    if (status !== undefined && !isValidStatus(status)) {
      return res.status(400).json({
        message: "Status must be ACTIVE or INACTIVE",
      });
    }

    const branch = await prisma.branch.create({
      data: {
        name: name.trim(),
        address:
          typeof address === "string" ? address.trim() || null : null,
        phone: typeof phone === "string" ? phone.trim() || null : null,
        ...(status !== undefined ? { status } : {}),
      },
    });

    return res.status(201).json({
      message: "Branch created successfully",
      data: branch,
    });
  } catch (error) {
    console.error("Error creating branch:", error);

    if (isDuplicateNameError(error)) {
      return res.status(409).json({
        message: "A branch with this name already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to create branch",
    });
  }
});

// PUT: Update an existing branch
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, address, phone, status } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Please provide a valid branch ID",
      });
    }

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Branch name is required",
      });
    }

    if (
      address !== undefined &&
      address !== null &&
      typeof address !== "string"
    ) {
      return res.status(400).json({
        message: "Address must be a string",
      });
    }

    if (
      phone !== undefined &&
      phone !== null &&
      typeof phone !== "string"
    ) {
      return res.status(400).json({
        message: "Phone must be a string",
      });
    }

    if (status !== undefined && !isValidStatus(status)) {
      return res.status(400).json({
        message: "Status must be ACTIVE or INACTIVE",
      });
    }

    const existingBranch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!existingBranch) {
      return res.status(404).json({
        message: "Branch not found",
      });
    }

    const updatedBranch = await prisma.branch.update({
      where: { id },
      data: {
        name: name.trim(),
        ...(address !== undefined
          ? {
              address:
                typeof address === "string" ? address.trim() || null : null,
            }
          : {}),
        ...(phone !== undefined
          ? {
              phone:
                typeof phone === "string" ? phone.trim() || null : null,
            }
          : {}),
        ...(status !== undefined ? { status } : {}),
      },
    });

    return res.status(200).json({
      message: "Branch updated successfully",
      data: updatedBranch,
    });
  } catch (error) {
    console.error("Error updating branch:", error);

    if (isDuplicateNameError(error)) {
      return res.status(409).json({
        message: "A branch with this name already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to update branch",
    });
  }
});

// DELETE: Delete an existing branch
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Please provide a valid branch ID",
      });
    }

    const existingBranch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!existingBranch) {
      return res.status(404).json({
        message: "Branch not found",
      });
    }

    await prisma.branch.delete({
      where: { id },
    });

    return res.status(200).json({
      message: "Branch deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting branch:", error);

    return res.status(500).json({
      message: "Failed to delete branch",
    });
  }
});

export default router;
