import Joi from "joi";

export const createOptionGroupSchema = Joi.object({
  name: Joi.string().max(60).required(),
  selection: Joi.string().valid("SINGLE", "MULTIPLE").default("SINGLE"),
  isRequired: Joi.boolean().default(false),
  minSelect: Joi.number().integer().min(0).default(0),
  maxSelect: Joi.number().integer().min(1).default(1),
  sortOrder: Joi.number().integer().default(0),
  values: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().max(60).required(),
        priceDelta: Joi.number().integer().default(0),
        isDefault: Joi.boolean().default(false),
        isAvailable: Joi.boolean().default(true),
        sortOrder: Joi.number().integer().default(0),
      })
    )
    .optional(),
});

export const updateOptionGroupSchema = Joi.object({
  name: Joi.string().max(60).optional(),
  selection: Joi.string().valid("SINGLE", "MULTIPLE").optional(),
  isRequired: Joi.boolean().optional(),
  minSelect: Joi.number().integer().min(0).optional(),
  maxSelect: Joi.number().integer().min(1).optional(),
  sortOrder: Joi.number().integer().optional(),
  isActive: Joi.boolean().optional(),
});

export const createOptionValueSchema = Joi.object({
  name: Joi.string().max(60).required(),
  priceDelta: Joi.number().integer().default(0),
  isDefault: Joi.boolean().default(false),
  isAvailable: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
});

export const updateOptionValueSchema = Joi.object({
  name: Joi.string().max(60).optional(),
  priceDelta: Joi.number().integer().optional(),
  isDefault: Joi.boolean().optional(),
  isAvailable: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().optional(),
});

export const assignProductOptionGroupSchema = Joi.object({
  groupId: Joi.string().uuid().required(),
  sortOrder: Joi.number().integer().default(0),
});
