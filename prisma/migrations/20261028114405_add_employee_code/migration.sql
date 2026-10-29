
---Add employeeCode as an optional column first
ALTER TABLE "Employee"
ADD COLUMN "employeeCode" TEXT;

---Assign employee codes to existing employees
WITH numbered_employees AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (ORDER BY "id") AS row_number
    FROM "Employee"
)
UPDATE "Employee"
SET "employeeCode" = 'EMP-' || LPAD(numbered_employees.row_number::TEXT, 3, '0')
FROM numbered_employees
WHERE "Employee"."id" = numbered_employees."id";

---Make employeeCode required
ALTER TABLE "Employee"
ALTER COLUMN "employeeCode" SET NOT NULL;

---Ensure employee codes are unique
CREATE UNIQUE INDEX "Employee_employeeCode_key"
ON "Employee"("employeeCode");

