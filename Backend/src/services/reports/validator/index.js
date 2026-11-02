import Joi from "joi";

export const dateFilterSchema = Joi.object({
  start_date: Joi.string().isoDate().optional(),
  end_date: Joi.string().isoDate().optional(),
  startDate: Joi.string().isoDate().optional(),
  endDate: Joi.string().isoDate().optional(),
  period: Joi.string()
    .valid("today", "yesterday", "this_week", "this_month", "last_month", "all", "custom")
    .optional(),
  limit: Joi.number().integer().min(1).max(500).default(50),
  page: Joi.number().integer().min(1).default(1),
  format: Joi.string().valid("pdf", "csv", "json").default("json"),
});
