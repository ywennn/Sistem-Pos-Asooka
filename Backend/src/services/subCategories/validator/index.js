import Joi from "joi";

export const subCategorySchema = Joi.object({
  name: Joi.string().required(),
  categoryId: Joi.string().uuid().required(),
  slug: Joi.string().required(),
});

export const updateSubCategorySchema = Joi.object({
  name: Joi.string().optional(),
  categoryId: Joi.string().uuid().optional(),
  slug: Joi.string().optional(),
});
