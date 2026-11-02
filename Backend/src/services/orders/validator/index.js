import Joi from "joi";

export const createOrderSchema = Joi.object({
  customerName: Joi.string().max(100).default("Pelanggan"),
  source: Joi.string()
    .valid("CASHIER", "KIOSK", "DINE_IN", "TAKE_AWAY")
    .default("CASHIER"),
  notes: Joi.string().allow("", null).optional(),
  kioskSessionId: Joi.string().uuid().allow(null).optional(),
  discountAmount: Joi.number().min(0).default(0),
  taxAmount: Joi.number().min(0).default(0),
  items: Joi.array()
    .min(1)
    .items(
      Joi.object({
        productId: Joi.string().uuid().required(),
        quantity: Joi.number().integer().min(1).default(1),
        notes: Joi.string().allow("", null).optional(),
        selectedOptionValueIds: Joi.array()
          .items(Joi.string().uuid())
          .default([]),
      })
    )
    .required(),
});

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid("PENDING", "PAID", "PROCESSING", "COMPLETED", "CANCELLED")
    .required(),
});
