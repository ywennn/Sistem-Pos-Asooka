import OrderRepository from "../repositories/orders-repositories.js";
import response from "../../../utils/response.js";
import { NotFoundError } from "../../../exceptions/index.js";
import { io } from "../../../server/index.js";
import AuditLogService from "../../auditLogs/services/audit-log-service.js";

const createOrder = async (req, res, next) => {
  try {
    const cashierId = req.user?.id || null;
    const {
      customerName,
      source,
      notes,
      kioskSessionId,
      discountAmount,
      taxAmount,
      items,
    } = req.validated;

    const order = await OrderRepository.createOrder({
      customerName,
      source,
      notes,
      cashierId,
      kioskSessionId,
      discountAmount,
      taxAmount,
      items,
    });

    // Kirim pembaruan real-time ke tablet kasir dan pelanggan via Socket.IO
    if (io) {
      const kioskNamespace = io.of("/kiosk");
      if (kioskSessionId) {
        kioskNamespace.to(`session:${kioskSessionId}`).emit("kiosk:sync-event", {
          actionType: "ORDER_CREATED",
          payload: { order },
          timestamp: new Date().toISOString(),
        });
      }
      kioskNamespace.emit("order:created", {
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: order.customer_name,
        totalAmount: order.total_amount,
        status: order.status,
        order,
      });
    }

    AuditLogService.recordActivity(req, {
      action: "CREATE",
      module: "ORDERS",
      entityType: "ORDER",
      entityId: order.id,
      description: `Membuat pesanan baru '${order.order_number}' untuk '${order.customer_name}'`,
      newData: {
        orderNumber: order.order_number,
        totalAmount: order.total_amount,
        source: order.source,
      },
    });

    return response(res, 201, "Pesanan berhasil dibuat", {
      order,
    });
  } catch (error) {
    return next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await OrderRepository.getOrderById(id);
    if (!order) {
      return next(new NotFoundError("Pesanan tidak ditemukan"));
    }

    return response(res, 200, "Berhasil mendapatkan pesanan", {
      order,
    });
  } catch (error) {
    return next(error);
  }
};

const getOrderByNumber = async (req, res, next) => {
  try {
    const { orderNumber } = req.params;
    const order = await OrderRepository.getOrderByOrderNumber(orderNumber);
    if (!order) {
      return next(new NotFoundError("Pesanan tidak ditemukan"));
    }

    return response(res, 200, "Berhasil mendapatkan pesanan", {
      order,
    });
  } catch (error) {
    return next(error);
  }
};

const getAllOrders = async (req, res, next) => {
  try {
    const { status, source, cashierId, kioskSessionId, limit, page } = req.query;
    const numLimit = Number(limit) || 50;
    const numPage = Number(page) || 1;
    const offset = (numPage - 1) * numLimit;

    const orders = await OrderRepository.getAllOrders({
      status,
      source,
      cashierId,
      kioskSessionId,
      limit: numLimit,
      offset,
    });

    return response(res, 200, "Berhasil mendapatkan daftar pesanan", {
      page: numPage,
      limit: numLimit,
      orders,
    });
  } catch (error) {
    return next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.validated;

    const order = await OrderRepository.updateOrderStatus(id, status);
    if (!order) {
      return next(new NotFoundError("Pesanan tidak ditemukan"));
    }

    // Broadcast status update via Socket.IO
    if (io) {
      const kioskNamespace = io.of("/kiosk");
      if (order.kiosk_session_id) {
        kioskNamespace.to(`session:${order.kiosk_session_id}`).emit("kiosk:sync-event", {
          actionType: "ORDER_STATUS_UPDATED",
          payload: { orderId: order.id, status: order.status },
          timestamp: new Date().toISOString(),
        });
      }
      kioskNamespace.emit("order:status-changed", {
        orderId: order.id,
        orderNumber: order.order_number,
        status: order.status,
      });
    }

    AuditLogService.recordActivity(req, {
      action: status === "CANCELLED" ? "CANCEL" : "UPDATE",
      module: "ORDERS",
      entityType: "ORDER",
      entityId: id,
      description: status === "CANCELLED"
        ? `Membatalkan pesanan '${order.order_number}'`
        : `Mengubah status pesanan '${order.order_number}' menjadi '${status}'`,
      newData: { status },
    });

    return response(res, 200, "Status pesanan berhasil diperbarui", {
      order,
    });
  } catch (error) {
    return next(error);
  }
};

export {
  createOrder,
  getOrderById,
  getOrderByNumber,
  getAllOrders,
  updateOrderStatus,
};
