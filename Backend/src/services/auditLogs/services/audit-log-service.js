import AuditLogRepository from "../repositories/audit-log-repository.js";

class AuditLogService {
  /**
   * Helper non-blocking untuk mencatat aktivitas penting pengguna
   */
  async recordActivity(req, {
    action,
    module,
    entityType = null,
    entityId = null,
    description = null,
    oldData = null,
    newData = null,
    userId = null,
  }) {
    try {
      const activeUserId = userId || req?.user?.id || null;

      let ipAddress = null;
      if (req) {
        ipAddress =
          req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
          req.ip ||
          req.socket?.remoteAddress ||
          null;
      }

      const userAgent = req?.headers ? req.headers["user-agent"] : null;

      await AuditLogRepository.createLog({
        userId: activeUserId,
        action,
        module,
        entityType,
        entityId,
        description,
        oldData,
        newData,
        ipAddress,
        userAgent,
      });
    } catch (error) {
      // Catat error ke console tanpa memutus alur request utama
      console.error("[AuditLogService] Gagal mencatat log aktivitas:", error.message);
    }
  }

  async getLogs(queryParams) {
    const {
      userId,
      user_id,
      action,
      module,
      entityType,
      entity_type,
      startDate,
      start_date,
      endDate,
      end_date,
      limit = 50,
      page = 1,
    } = queryParams;

    const numLimit = Number(limit) || 50;
    const numPage = Number(page) || 1;
    const offset = (numPage - 1) * numLimit;

    const { logs, total } = await AuditLogRepository.getLogs({
      userId: userId || user_id,
      action,
      module,
      entityType: entityType || entity_type,
      startDate: startDate || start_date,
      endDate: endDate || end_date,
      limit: numLimit,
      offset,
    });

    return {
      pagination: {
        page: numPage,
        limit: numLimit,
        totalItems: total,
        totalPages: Math.ceil(total / numLimit) || 1,
      },
      logs,
    };
  }

  async getLogById(id) {
    return AuditLogRepository.getLogById(id);
  }

  async getFilters() {
    return AuditLogRepository.getDistinctFilters();
  }
}

export default new AuditLogService();
