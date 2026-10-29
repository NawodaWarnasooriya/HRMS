import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./config/prisma";
import departmentRoutes from "./routes/department.routes";
import employeeRoutes from "./routes/employee.routes";
import designationRoutes from "./routes/designation.routes";
import branchRoutes from "./routes/branch.routes";
import userRoutes from "./routes/user.routes";
import roleRoutes from "./routes/role.routes";
import permissionRoutes from "./routes/permission.routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Department API routes
app.use("/api/departments", departmentRoutes);

// Employee API routes
app.use("/api/employees", employeeRoutes);

// Designation API routes
app.use("/api/designations", designationRoutes);

// Branch API routes
app.use("/api/branches", branchRoutes);


// User API routes
app.use("/api/users", userRoutes);

// Role API routes
app.use("/api/roles", roleRoutes);

// Permission API routes
app.use("/api/permissions", permissionRoutes);

// Home route
app.get("/", (req, res) => {
res.status(200).json({
message: "HRMS Backend API is running successfully",
});
});

// Database connection test
app.get("/api/db-status", async (req, res) => {
try {
await prisma.$connect();


return res.status(200).json({
  message: "Database connected successfully",
});


} catch (error) {
console.error("Database connection failed:", error);


return res.status(500).json({
  message: "Database connection failed",
});


}
});

// Handle unknown routes
app.use((req, res) => {
  return res.status(404).json({
    message: "API route not found",
  });
});

// Global error handler
app.use(
  (
    error: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Unhandled error:", error);

    if (res.headersSent) {
      return next(error);
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
);

app.listen(PORT, () => {
console.log(`HRMS server is running on port ${PORT}`);
});
