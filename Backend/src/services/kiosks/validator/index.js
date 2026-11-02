import Joi from "joi";

export const registerDeviceSchema = Joi.object({
  deviceName: Joi.string().max(100).required(),
  deviceCode: Joi.string().max(50).required(),
  deviceType: Joi.string().valid("CASHIER", "CUSTOMER").required(),
  deviceTokenHash: Joi.string().allow("", null).optional(),
});

export const updateDeviceSchema = Joi.object({
  deviceName: Joi.string().max(100).optional(),
  deviceType: Joi.string().valid("CASHIER", "CUSTOMER").optional(),
  isActive: Joi.boolean().optional(),
});

export const startSessionSchema = Joi.object({
  cashierDeviceId: Joi.string().uuid().required(),
  customerDeviceId: Joi.string().uuid().required(),
});

export const syncStateSchema = Joi.object({
  stateData: Joi.object().required(),
});
