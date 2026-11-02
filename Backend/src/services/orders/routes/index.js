import { Router } from "express";
import validate from "../../../middlewares/validate.js";
import auth, { optionalAuth } from "../../../middlewares/auth.js";
import {
  createOrderSchema,
  updateOrderStatusSchema,
} from "../validator/index.js";
import {
  createOrder,
  getAllOrders,
  getOrderById,
  getOrderByNumber,
  updateOrderStatus,
} from "../controller/orders-controller.js";

const router = Router();

router.post(
  "/orders",
  optionalAuth,
  validate(createOrderSchema),
  createOrder
);

router.get("/orders", auth, getAllOrders);
router.get("/orders/number/:orderNumber", auth, getOrderByNumber);
router.get("/orders/:id", auth, getOrderById);

router.patch(
  "/orders/:id/status",
  auth,
  validate(updateOrderStatusSchema),
  updateOrderStatus
);

export default router;
