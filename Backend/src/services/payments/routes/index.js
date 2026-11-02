import { Router } from "express";
import validate from "../../../middlewares/validate.js";
import guard from "../../../middlewares/guard.js";
import auth, { optionalAuth } from "../../../middlewares/auth.js";
import {
  createPaymentSchema,
  confirmCashPaymentSchema,
} from "../validator/index.js";
import {
  createPayment,
  confirmCashPayment,
  getPaymentByOrderId,
  getPaymentById,
  handleMidtransWebhook,
} from "../controller/payments-controller.js";

const router = Router();

// ================= PUBLIC WEBHOOK (MIDTRANS) =================
router.post("/payments/webhook", handleMidtransWebhook);

// ================= PAYMENT CREATION (KIOSK & CASHIER) =================
router.post(
  "/payments",
  optionalAuth,
  validate(createPaymentSchema),
  createPayment
);

router.get(
  "/payments/order/:orderId",
  optionalAuth,
  getPaymentByOrderId
);

router.get(
  "/payments/:id",
  optionalAuth,
  getPaymentById
);

// ================= CASHIER ONLY ENDPOINTS =================
router.post(
  "/payments/:paymentId/confirm-cash",
  auth,
  guard("CASHIER"),
  validate(confirmCashPaymentSchema),
  confirmCashPayment
);

export default router;
