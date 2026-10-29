import { Router, Request, Response } from "express";
import { Prisma } from "@prisma/client";

import prisma from "../config/prisma";

const router = Router();

// Validate employee ID
const isValidId = (id: number): boolean => {
  return Number.isInteger(id) && id > 0;
};

// Validate email
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Validate optional phone
const isValidPhone = (phone: unknown): boolean => {
  return (
    phone === undefined ||
    phone === null ||
    typeof phone === "string"
  );
};

// Check Prisma unique constraint error
const isDuplicateError = (error: unknown): boolean => {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
};

// Check Prisma foreign key constraint error
const isForeignKeyError = (error: unknown): boolean => {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  );
};

// Employee response relations
const employeeInclude = {
  department: true,
  designation: true,
  reportingManager: {
    select: {
      id: true,
      employeeCode: true,
      name: true,
      email: true,
    },
  },
};

// GET: Retrieve all employees
router.get("/", async (req: Request, res: Response) => {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { id: "asc" },
      include: employeeInclude,
    });

    return res.status(200).json({
      message: "Employees retrieved successfully",
      data: employees,
    });
  } catch (error) {
    console.error("Error retrieving employees:", error);

    return res.status(500).json({
      message: "Failed to retrieve employees",
    });
  }
});

// GET: Retrieve one employee by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid employee ID",
      });
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: employeeInclude,
    });

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    return res.status(200).json({
      message: "Employee retrieved successfully",
      data: employee,
    });
  } catch (error) {
    console.error("Error retrieving employee:", error);

    return res.status(500).json({
      message: "Failed to retrieve employee",
    });
  }
});

// POST: Create a new employee
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      phone,
      position,
      departmentId,
      designationId,
      reportingManagerId,
    } = req.body;

    // Required field validation
    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof position !== "string" ||
      !position.trim() ||
      departmentId === undefined ||
      departmentId === null ||
      departmentId === ""
    ) {
      return res.status(400).json({
        message:
          "Name, email, position and departmentId are required",
      });
    }

    // Phone validation
    if (!isValidPhone(phone)) {
      return res.status(400).json({
        message: "Phone must be a string",
      });
    }

    // Email validation
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        message: "Please provide a valid email",
      });
    }

    // Department ID validation
    const parsedDepartmentId = Number(departmentId);

    if (!isValidId(parsedDepartmentId)) {
      return res.status(400).json({
        message: "Invalid departmentId",
      });
    }

    // Designation ID validation
    let parsedDesignationId: number | null = null;

    if (
      designationId !== undefined &&
      designationId !== null &&
      designationId !== ""
    ) {
      parsedDesignationId = Number(designationId);

      if (!isValidId(parsedDesignationId)) {
        return res.status(400).json({
          message: "Invalid designationId",
        });
      }
    }

    // Reporting manager ID validation
    let parsedReportingManagerId: number | null = null;

    if (
      reportingManagerId !== undefined &&
      reportingManagerId !== null &&
      reportingManagerId !== ""
    ) {
      parsedReportingManagerId = Number(reportingManagerId);

      if (!isValidId(parsedReportingManagerId)) {
        return res.status(400).json({
          message: "Invalid reportingManagerId",
        });
      }
    }

    // Check department
    const department = await prisma.department.findUnique({
      where: { id: parsedDepartmentId },
    });

    if (!department) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    // Check designation
    if (parsedDesignationId !== null) {
      const designation = await prisma.designation.findUnique({
        where: { id: parsedDesignationId },
      });

      if (!designation) {
        return res.status(404).json({
          message: "Designation not found",
        });
      }
    }

    // Check reporting manager
    if (parsedReportingManagerId !== null) {
      const manager = await prisma.employee.findUnique({
        where: { id: parsedReportingManagerId },
      });

      if (!manager) {
        return res.status(404).json({
          message: "Reporting manager not found",
        });
      }

      if (manager.status !== "ACTIVE") {
        return res.status(400).json({
          message: "Reporting manager must be active",
        });
      }
    }

    // Check duplicate email
    const existingEmployee = await prisma.employee.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingEmployee) {
      return res.status(409).json({
        message: "An employee with this email already exists",
      });
    }

    // Generate employee code
    const lastEmployee = await prisma.employee.findFirst({
      orderBy: { id: "desc" },
      select: { id: true },
    });

    const nextEmployeeNumber = (lastEmployee?.id ?? 0) + 1;

    const employeeCode =
      `EMP-${String(nextEmployeeNumber).padStart(3, "0")}`;

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        employeeCode,
        name: name.trim(),
        email: normalizedEmail,
        phone:
          typeof phone === "string" ? phone.trim() || null : null,
        position: position.trim(),
        departmentId: parsedDepartmentId,
        designationId: parsedDesignationId,
        reportingManagerId: parsedReportingManagerId,
      },
      include: employeeInclude,
    });

    return res.status(201).json({
      message: "Employee created successfully",
      data: employee,
    });
  } catch (error) {
    console.error("Error creating employee:", error);

    if (isDuplicateError(error)) {
      return res.status(409).json({
        message: "Employee email or employee code already exists",
      });
    }

    if (isForeignKeyError(error)) {
      return res.status(400).json({
        message:
          "Invalid department, designation or reporting manager reference",
      });
    }

    return res.status(500).json({
      message: "Failed to create employee",
    });
  }
});

// PUT: Update an employee
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid employee ID",
      });
    }

    const {
      name,
      email,
      phone,
      position,
      departmentId,
      designationId,
      reportingManagerId,
    } = req.body;

    const existingEmployee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!existingEmployee) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    // Name validation
    if (
      name !== undefined &&
      (typeof name !== "string" || !name.trim())
    ) {
      return res.status(400).json({
        message: "Name must be a non-empty string",
      });
    }

    // Email validation
    if (
      email !== undefined &&
      (typeof email !== "string" ||
        !isValidEmail(email.trim()))
    ) {
      return res.status(400).json({
        message: "Please provide a valid email",
      });
    }

    // Position validation
    if (
      position !== undefined &&
      (typeof position !== "string" || !position.trim())
    ) {
      return res.status(400).json({
        message: "Position must be a non-empty string",
      });
    }

    // Phone validation
    if (!isValidPhone(phone)) {
      return res.status(400).json({
        message: "Phone must be a string",
      });
    }

    // Department ID validation
    let parsedDepartmentId: number | undefined;

    if (departmentId !== undefined) {
      parsedDepartmentId = Number(departmentId);

      if (!isValidId(parsedDepartmentId)) {
        return res.status(400).json({
          message: "Invalid departmentId",
        });
      }

      const department = await prisma.department.findUnique({
        where: { id: parsedDepartmentId },
      });

      if (!department) {
        return res.status(404).json({
          message: "Department not found",
        });
      }
    }

    // Designation ID validation
    let parsedDesignationId: number | null | undefined;

    if (designationId !== undefined) {
      if (designationId === null || designationId === "") {
        parsedDesignationId = null;
      } else {
        parsedDesignationId = Number(designationId);

        if (!isValidId(parsedDesignationId)) {
          return res.status(400).json({
            message: "Invalid designationId",
          });
        }

        const designation = await prisma.designation.findUnique({
          where: { id: parsedDesignationId },
        });

        if (!designation) {
          return res.status(404).json({
            message: "Designation not found",
          });
        }
      }
    }

    // Reporting manager validation
    let parsedReportingManagerId: number | null | undefined;

    if (reportingManagerId !== undefined) {
      if (
        reportingManagerId === null ||
        reportingManagerId === ""
      ) {
        parsedReportingManagerId = null;
      } else {
        parsedReportingManagerId = Number(reportingManagerId);

        if (!isValidId(parsedReportingManagerId)) {
          return res.status(400).json({
            message: "Invalid reportingManagerId",
          });
        }

        if (parsedReportingManagerId === id) {
          return res.status(400).json({
            message:
              "An employee cannot be their own reporting manager",
          });
        }

        const manager = await prisma.employee.findUnique({
          where: { id: parsedReportingManagerId },
        });

        if (!manager) {
          return res.status(404).json({
            message: "Reporting manager not found",
          });
        }

        if (manager.status !== "ACTIVE") {
          return res.status(400).json({
            message: "Reporting manager must be active",
          });
        }
      }
    }

    // Normalize email
    const normalizedEmail =
      email !== undefined
        ? email.trim().toLowerCase()
        : undefined;

    // Check duplicate email
    if (normalizedEmail !== undefined) {
      const duplicateEmail = await prisma.employee.findFirst({
        where: {
          email: normalizedEmail,
          NOT: { id },
        },
      });

      if (duplicateEmail) {
        return res.status(409).json({
          message: "Another employee already uses this email",
        });
      }
    }

    // Update employee
    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(normalizedEmail !== undefined
          ? { email: normalizedEmail }
          : {}),
        ...(phone !== undefined
          ? {
              phone:
                typeof phone === "string"
                  ? phone.trim() || null
                  : null,
            }
          : {}),
        ...(position !== undefined
          ? { position: position.trim() }
          : {}),
        ...(parsedDepartmentId !== undefined
          ? { departmentId: parsedDepartmentId }
          : {}),
        ...(parsedDesignationId !== undefined
          ? { designationId: parsedDesignationId }
          : {}),
        ...(parsedReportingManagerId !== undefined
          ? { reportingManagerId: parsedReportingManagerId }
          : {}),
      },
      include: employeeInclude,
    });

    return res.status(200).json({
      message: "Employee updated successfully",
      data: employee,
    });
  } catch (error) {
    console.error("Error updating employee:", error);

    if (isDuplicateError(error)) {
      return res.status(409).json({
        message: "Another employee already uses this email",
      });
    }

    if (isForeignKeyError(error)) {
      return res.status(400).json({
        message:
          "Invalid department, designation or reporting manager reference",
      });
    }

    return res.status(500).json({
      message: "Failed to update employee",
    });
  }
});

// DELETE: Permanently delete an employee
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid employee ID",
      });
    }

    const existingEmployee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!existingEmployee) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    // Employees cannot be deleted while they manage subordinates
    const subordinateCount = await prisma.employee.count({
      where: { reportingManagerId: id },
    });

    if (subordinateCount > 0) {
      return res.status(409).json({
        message:
          "Cannot delete this employee because other employees report to them",
      });
    }

    await prisma.employee.delete({
      where: { id },
    });

    return res.status(200).json({
      message: "Employee deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting employee:", error);

    if (isForeignKeyError(error)) {
      return res.status(409).json({
        message:
          "Cannot delete this employee because other records reference them",
      });
    }

    return res.status(500).json({
      message: "Failed to delete employee",
    });
  }
});

// PATCH: Deactivate an employee
router.patch("/:id/deactivate", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid employee ID",
      });
    }

    const existingEmployee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!existingEmployee) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    if (existingEmployee.status === "INACTIVE") {
      return res.status(400).json({
        message: "Employee is already inactive",
      });
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: { status: "INACTIVE" },
      include: employeeInclude,
    });

    return res.status(200).json({
      message: "Employee deactivated successfully",
      data: employee,
    });
  } catch (error) {
    console.error("Error deactivating employee:", error);

    return res.status(500).json({
      message: "Failed to deactivate employee",
    });
  }
});

// PATCH: Activate an employee
router.patch("/:id/activate", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid employee ID",
      });
    }

    const existingEmployee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!existingEmployee) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    if (existingEmployee.status === "ACTIVE") {
      return res.status(400).json({
        message: "Employee is already active",
      });
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: { status: "ACTIVE" },
      include: employeeInclude,
    });

    return res.status(200).json({
      message: "Employee activated successfully",
      data: employee,
    });
  } catch (error) {
    console.error("Error activating employee:", error);

    return res.status(500).json({
      message: "Failed to activate employee",
    });
  }
});

// PATCH: Assign or remove an employee's reporting manager
router.patch(
  "/:id/reporting-manager",
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { reportingManagerId } = req.body;

      if (!isValidId(id)) {
        return res.status(400).json({
          message: "Invalid employee ID",
        });
      }

      if (
        reportingManagerId === undefined ||
        (reportingManagerId !== null &&
          !isValidId(Number(reportingManagerId)))
      ) {
        return res.status(400).json({
          message:
            "Provide a valid reportingManagerId or null to remove the manager",
        });
      }

      const employee = await prisma.employee.findUnique({
        where: { id },
      });

      if (!employee) {
        return res.status(404).json({
          message: "Employee not found",
        });
      }

      if (reportingManagerId !== null) {
        const managerId = Number(reportingManagerId);

        if (managerId === id) {
          return res.status(400).json({
            message:
              "An employee cannot be their own reporting manager",
          });
        }

        const manager = await prisma.employee.findUnique({
          where: { id: managerId },
        });

        if (!manager) {
          return res.status(404).json({
            message: "Reporting manager not found",
          });
        }

        if (manager.status !== "ACTIVE") {
          return res.status(400).json({
            message: "Reporting manager must be active",
          });
        }
      }

      const updatedEmployee = await prisma.employee.update({
        where: { id },
        data: {
          reportingManagerId:
            reportingManagerId === null
              ? null
              : Number(reportingManagerId),
        },
        include: employeeInclude,
      });

      return res.status(200).json({
        message: "Reporting manager updated successfully",
        data: updatedEmployee,
      });
    } catch (error) {
      console.error("Error assigning reporting manager:", error);

      return res.status(500).json({
        message: "Failed to update reporting manager",
      });
    }
  }
);

export default router;