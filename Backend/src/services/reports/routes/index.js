import { Router } from "express";
import auth from "../../../middlewares/auth.js";
import guard from "../../../middlewares/guard.js";
import { dateFilterSchema } from "../validator/index.js";
import {
  getDashboard,
  getSales,
  getBestSelling,
  getPayments,
  getTransactions,
  exportReport,
} from "../controller/report-controller.js";

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
  "/reports/dashboard",
  auth,
  guard("ADMIN", "CASHIER"),
  validateQuery(dateFilterSchema),
  getDashboard
);

router.get(
  "/reports/sales",
  auth,
  guard("ADMIN", "CASHIER"),
  validateQuery(dateFilterSchema),
  getSales
);

router.get(
  "/reports/best-selling",
  auth,
  guard("ADMIN", "CASHIER"),
  validateQuery(dateFilterSchema),
  getBestSelling
);

router.get(
  "/reports/payments",
  auth,
  guard("ADMIN", "CASHIER"),
  validateQuery(dateFilterSchema),
  getPayments
);

router.get(
  "/reports/transactions",
  auth,
  guard("ADMIN", "CASHIER"),
  validateQuery(dateFilterSchema),
  getTransactions
);

router.get(
  "/reports/export",
  auth,
  guard("ADMIN", "CASHIER"),
  validateQuery(dateFilterSchema),
  exportReport
);

export default router;
