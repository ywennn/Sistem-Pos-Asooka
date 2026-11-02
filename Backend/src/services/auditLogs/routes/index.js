import { Router } from "express";
import auth from "../../../middlewares/auth.js";
import guard from "../../../middlewares/guard.js";
import { queryAuditLogsSchema } from "../validators/audit-log-validator.js";
import {
  getAuditLogs,
  getAuditLogById,
  getAuditLogFilters,
} from "../controllers/audit-log-controller.js";

const router = Router();

const validateQuery = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    allowUnknown: true,
  });
  if (error) return next(error);
  req.query = value;
  next();
};

router.get(
  "/audit-logs",
  auth,
  guard("ADMIN"),
  validateQuery(queryAuditLogsSchema),
  getAuditLogs
);

router.get(
  "/audit-logs/filters",
  auth,
  guard("ADMIN"),
  getAuditLogFilters
);

router.get(
  "/audit-logs/:id",
  auth,
  guard("ADMIN"),
  getAuditLogById
);

export default router;
