import AuditLogService from "../services/audit-log-service.js";
import response from "../../../utils/response.js";
import { NotFoundError } from "../../../exceptions/index.js";

const getAuditLogs = async (req, res, next) => {
  try {
    const data = await AuditLogService.getLogs(req.query);
    return response(res, 200, "Berhasil mendapatkan log aktivitas", data);
  } catch (error) {
    return next(error);
  }
};

const getAuditLogById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const log = await AuditLogService.getLogById(id);
    if (!log) {
      return next(new NotFoundError("Log aktivitas tidak ditemukan"));
    }
    return response(res, 200, "Berhasil mendapatkan detail log aktivitas", { log });
  } catch (error) {
    return next(error);
  }
};

const getAuditLogFilters = async (req, res, next) => {
  try {
    const filters = await AuditLogService.getFilters();
    return response(res, 200, "Berhasil mendapatkan opsi filter log aktivitas", { filters });
  } catch (error) {
    return next(error);
  }
};

export {
  getAuditLogs,
  getAuditLogById,
  getAuditLogFilters,
};
