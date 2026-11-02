import Joi from "joi";

export const queryAuditLogsSchema = Joi.object({
  userId: Joi.string().uuid().optional(),
  user_id: Joi.string().uuid().optional(),
  action: Joi.string().max(100).optional(),
  module: Joi.string().max(50).optional(),
  entityType: Joi.string().max(50).optional(),
  entity_type: Joi.string().max(50).optional(),
  startDate: Joi.string().isoDate().optional(),
  start_date: Joi.string().isoDate().optional(),
  endDate: Joi.string().isoDate().optional(),
  end_date: Joi.string().isoDate().optional(),
  limit: Joi.number().integer().min(1).max(500).default(50),
  page: Joi.number().integer().min(1).default(1),
});
