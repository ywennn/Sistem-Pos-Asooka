import Joi from "joi";

export const createProductSchema = Joi.object({
  name: Joi.string().max(120).required(),
  categoryId: Joi.string().uuid().required(),
  subcategoryId: Joi.string().uuid().allow(null).optional(),
  description: Joi.string().allow("", null).optional(),
  price: Joi.number().integer().min(0).required(),
  imageUrl: Joi.string().uri().allow("", null).optional(),
  isAvailable: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().optional(),
});

export const updateProductSchema = Joi.object({
  name: Joi.string().max(120).optional(),
  categoryId: Joi.string().uuid().optional(),
  subcategoryId: Joi.string().uuid().allow(null).optional(),
  description: Joi.string().allow("", null).optional(),
  price: Joi.number().integer().min(0).optional(),
  imageUrl: Joi.string().uri().allow("", null).optional(),
  isAvailable: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().optional(),
});
