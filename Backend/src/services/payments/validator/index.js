import Joi from "joi";

export const createPaymentSchema = Joi.object({
  orderId: Joi.string().uuid().required(),
  paymentMethod: Joi.string().valid("CASH", "QRIS").required(),
});

export const confirmCashPaymentSchema = Joi.object({
  amountTendered: Joi.number().min(0).optional(),
});
