import PaymentRepository from "../repositories/payments-repositories.js";
import OrderRepository from "../../orders/repositories/orders-repositories.js";
import MidtransService from "../services/midtrans-service.js";
import response from "../../../utils/response.js";
import { InvariantError, NotFoundError } from "../../../exceptions/index.js";
import { io } from "../../../server/index.js";
import AuditLogService from "../../auditLogs/services/audit-log-service.js";

const createPayment = async (req, res, next) => {
  try {
    const { orderId, paymentMethod } = req.validated;

    const order = await OrderRepository.getOrderById(orderId);
    if (!order) {
      return next(new NotFoundError("Pesanan tidak ditemukan"));
    }

    if (order.status === "PAID" || order.status === "COMPLETED") {
      return next(new InvariantError("Pesanan sudah terbayar"));
    }
    if (order.status === "CANCELLED") {
      return next(new InvariantError("Pesanan sudah dibatalkan"));
    }

    // Cek jika sudah ada transaksi pembayaran pending untuk order ini
    const existingPayment = await PaymentRepository.getPaymentByOrderId(orderId);
    if (existingPayment && ["PENDING", "PENDING_CONFIRMATION"].includes(existingPayment.payment_status)) {
      // Jika metode sama, kembalikan pembayaran yang sudah ada
      if (existingPayment.payment_method === paymentMethod) {
        return response(res, 200, "Pembayaran sudah dibuat sebelumnya", {
          payment: existingPayment,
        });
      }
    }

    let payment;
    const amount = Number(order.total_amount);

    if (paymentMethod === "CASH") {
      payment = await PaymentRepository.createPayment({
        orderId,
        paymentMethod: "CASH",
        paymentProvider: "CASH",
        paymentStatus: "PENDING_CONFIRMATION",
        amount,
        paymentReference: order.order_number,
      });

      // Siarkan ke tablet kasir dan pelanggan via Socket.IO
      if (io) {
        io.of("/kiosk").emit("kiosk:cash-pending", {
          paymentId: payment.id,
          orderId: order.id,
          orderNumber: order.order_number,
          customerName: order.customer_name,
          amount,
        });

        if (order.kiosk_session_id) {
          io.of("/kiosk").to(`session:${order.kiosk_session_id}`).emit("kiosk:sync-event", {
            actionType: "PAYMENT_PENDING_CASH",
            payload: {
              paymentId: payment.id,
              orderId: order.id,
              orderNumber: order.order_number,
              customerName: order.customer_name,
              amount,
            },
            timestamp: new Date().toISOString(),
          });
        }
      }
    } else if (paymentMethod === "QRIS") {
      const qrisData = await MidtransService.generateQRIS({
        orderNumber: order.order_number,
        amount,
      });

      payment = await PaymentRepository.createPayment({
        orderId,
        paymentMethod: "QRIS",
        paymentProvider: "MIDTRANS",
        paymentStatus: "PENDING",
        amount,
        transactionId: qrisData.transactionId,
        paymentReference: qrisData.paymentReference,
        qrCodeUrl: qrisData.qrCodeUrl,
        qrCodeString: qrisData.qrCodeString,
        expiresAt: qrisData.expiresAt,
      });

      // Tampilkan QRIS secara otomatis pada layar tablet kasir dan pelanggan
      if (io && order.kiosk_session_id) {
        io.of("/kiosk").to(`session:${order.kiosk_session_id}`).emit("kiosk:sync-event", {
          actionType: "PAYMENT_QRIS_DISPLAY",
          payload: {
            orderId: order.id,
            orderNumber: order.order_number,
            amount,
            qrCodeUrl: payment.qr_code_url,
            qrCodeString: payment.qr_code_string,
            expiresAt: payment.expires_at,
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    return response(res, 201, "Pembayaran berhasil diinisialisasi", {
      payment,
    });
  } catch (error) {
    return next(error);
  }
};

const confirmCashPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { amountTendered } = req.validated;

    const payment = await PaymentRepository.getPaymentById(paymentId);
    if (!payment) {
      return next(new NotFoundError("Pembayaran tidak ditemukan"));
    }

    if (payment.payment_method !== "CASH") {
      return next(new InvariantError("Konfirmasi tunai hanya berlaku untuk metode pembayaran CASH"));
    }

    if (payment.payment_status === "PAID") {
      return next(new InvariantError("Pembayaran ini sudah dikonfirmasi"));
    }

    const billAmount = Number(payment.amount);
    let changeAmount = 0;

    if (amountTendered !== undefined) {
      if (Number(amountTendered) < billAmount) {
        return next(new InvariantError("Uang yang diterima kurang dari total tagihan"));
      }
      changeAmount = Number(amountTendered) - billAmount;
    }

    const updatedPayment = await PaymentRepository.updatePaymentStatus(paymentId, {
      paymentStatus: "PAID",
      paidAt: new Date(),
    });

    AuditLogService.recordActivity(req, {
      action: "CONFIRM_PAYMENT",
      module: "PAYMENTS",
      entityType: "PAYMENT",
      entityId: paymentId,
      description: `Konfirmasi pembayaran tunai untuk Order '${payment.order_number}' sebesar Rp ${billAmount.toLocaleString("id-ID")}`,
      newData: {
        amount: billAmount,
        amountTendered: amountTendered || billAmount,
        change: changeAmount,
      },
    });

    // Beritahu tablet pelanggan dan kasir bahwa pembayaran tunai telah diterima
    if (io) {
      io.of("/kiosk").emit("kiosk:payment-success", {
        orderId: payment.order_id,
        orderNumber: payment.order_number,
        paymentMethod: "CASH",
        amount: billAmount,
        change: changeAmount,
      });

      if (payment.kiosk_session_id) {
        io.of("/kiosk").to(`session:${payment.kiosk_session_id}`).emit("kiosk:sync-event", {
          actionType: "PAYMENT_SUCCESS",
          payload: {
            orderId: payment.order_id,
            orderNumber: payment.order_number,
            paymentMethod: "CASH",
            amount: billAmount,
            amountTendered: amountTendered || billAmount,
            change: changeAmount,
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    return response(res, 200, "Pembayaran tunai berhasil dikonfirmasi", {
      payment: updatedPayment,
      change: changeAmount,
    });
  } catch (error) {
    return next(error);
  }
};

const getPaymentByOrderId = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const payment = await PaymentRepository.getPaymentByOrderId(orderId);
    if (!payment) {
      return next(new NotFoundError("Pembayaran untuk pesanan ini tidak ditemukan"));
    }

    return response(res, 200, "Berhasil mendapatkan pembayaran", {
      payment,
    });
  } catch (error) {
    return next(error);
  }
};

const getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await PaymentRepository.getPaymentById(id);
    if (!payment) {
      return next(new NotFoundError("Pembayaran tidak ditemukan"));
    }

    return response(res, 200, "Berhasil mendapatkan pembayaran", {
      payment,
    });
  } catch (error) {
    return next(error);
  }
};

// ================= MIDTRANS WEBHOOK =================
const handleMidtransWebhook = async (req, res, next) => {
  try {
    const payload = req.body;
    const {
      order_id: orderNumber,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signatureKey,
      transaction_status: transactionStatus,
      fraud_status: fraudStatus,
      transaction_id: transactionId,
    } = payload;

    console.log(`[Midtrans Webhook] Menerima event untuk Order: ${orderNumber}, Status: ${transactionStatus}`);

    // Cek jika ini adalah tes notifikasi dari Dashboard Midtrans ("Test notification URL")
    const isTestNotification = typeof orderNumber === "string" && orderNumber.startsWith("payment_notif_test_");
    if (isTestNotification) {
      console.log("[Midtrans Webhook] Test notification URL dari Dashboard Midtrans berhasil diterima!");
      return res.status(200).json({
        status: "success",
        message: "Test notification received successfully",
      });
    }

    // 1. Verifikasi Signature untuk transaksi asli
    const isValidSignature = MidtransService.verifySignature({
      orderId: orderNumber,
      statusCode,
      grossAmount,
      signatureKey,
    });

    if (!isValidSignature) {
      console.error("[Midtrans Webhook] Signature key tidak valid!");
      return res.status(400).json({ status: "fail", message: "Invalid signature key" });
    }

    // 2. Cari data pembayaran berdasarkan paymentReference / orderNumber
    const payment = await PaymentRepository.getPaymentByReference(orderNumber);
    const paymentId = payment ? payment.id : null;

    // 3. Catat notifikasi ke tabel payment_webhook_events
    const eventType = `notification:${transactionStatus}`;
    const isAlreadyProcessed = await PaymentRepository.isWebhookProcessed(transactionId, eventType);

    if (isAlreadyProcessed) {
      console.log(`[Midtrans Webhook] Event ${eventType} dengan ID ${transactionId} sudah diproses sebelumnya.`);
      return res.status(200).json({ status: "success", message: "Event already processed" });
    }

    const webhookRecord = await PaymentRepository.saveWebhookEvent({
      paymentId,
      eventType,
      transactionId,
      payload,
      isProcessed: false,
    });

    if (!payment) {
      console.warn(`[Midtrans Webhook] Data pembayaran untuk ${orderNumber} tidak ditemukan`);
      return res.status(200).json({ status: "success", message: "Payment record not found" });
    }

    // 4. Petakan status Midtrans ke Payment Status
    let targetPaymentStatus = payment.payment_status;

    if (
      transactionStatus === "settlement" ||
      (transactionStatus === "capture" && fraudStatus === "accept")
    ) {
      targetPaymentStatus = "PAID";
    } else if (transactionStatus === "expire") {
      targetPaymentStatus = "EXPIRED";
    } else if (["deny", "cancel", "failure"].includes(transactionStatus)) {
      targetPaymentStatus = "FAILED";
    }

    // 5. Update status pembayaran & pesanan
    const updatedPayment = await PaymentRepository.updatePaymentStatus(payment.id, {
      paymentStatus: targetPaymentStatus,
      transactionId,
      paidAt: targetPaymentStatus === "PAID" ? new Date() : null,
    });

    await PaymentRepository.markWebhookProcessed(webhookRecord.id);

    // 6. Siarkan notifikasi pembayaran real-time ke tablet Kasir & Pelanggan via Socket.IO
    if (io) {
      if (targetPaymentStatus === "PAID") {
        io.of("/kiosk").emit("kiosk:payment-success", {
          orderId: payment.order_id,
          orderNumber: payment.order_number,
          paymentMethod: "QRIS",
          amount: Number(payment.amount),
        });
      }

      if (payment.kiosk_session_id) {
        const room = `session:${payment.kiosk_session_id}`;
        if (targetPaymentStatus === "PAID") {
          io.of("/kiosk").to(room).emit("kiosk:sync-event", {
            actionType: "PAYMENT_SUCCESS",
            payload: {
              orderId: payment.order_id,
              orderNumber: payment.order_number,
              paymentMethod: "QRIS",
              amount: Number(payment.amount),
            },
            timestamp: new Date().toISOString(),
          });
        } else if (["FAILED", "EXPIRED"].includes(targetPaymentStatus)) {
          io.of("/kiosk").to(room).emit("kiosk:sync-event", {
            actionType: "PAYMENT_FAILED",
            payload: {
              orderId: payment.order_id,
              orderNumber: payment.order_number,
              status: targetPaymentStatus,
            },
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    return res.status(200).json({
      status: "success",
      message: "Notification handled successfully",
    });
  } catch (error) {
    console.error("[Midtrans Webhook Error]", error);
    return res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

export {
  createPayment,
  confirmCashPayment,
  getPaymentByOrderId,
  getPaymentById,
  handleMidtransWebhook,
};
