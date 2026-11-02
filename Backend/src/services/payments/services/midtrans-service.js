import crypto from "crypto";

class MidtransService {
  get serverKey() {
    return process.env.MIDTRANS_SERVER_KEY || "";
  }

  get isProduction() {
    return process.env.MIDTRANS_IS_PRODUCTION === "true";
  }

  get baseUrl() {
    return this.isProduction
      ? "https://api.midtrans.com/v2"
      : "https://api.sandbox.midtrans.com/v2";
  }

  getAuthHeader() {
    const encodedKey = Buffer.from(`${this.serverKey}:`).toString("base64");
    return `Basic ${encodedKey}`;
  }

  /**
   * Request QRIS Dinamis ke Midtrans Core API
   */
  async generateQRIS({ orderNumber, amount }) {
    // Mode Simulasi/Mock jika MIDTRANS_SERVER_KEY belum disetel
    if (!this.serverKey) {
      console.warn(
        "[Midtrans] MIDTRANS_SERVER_KEY belum diatur, menggunakan mode simulasi QRIS.",
      );
      const mockTrxId = `MOCK-TRX-${Date.now()}`;
      return {
        transactionId: mockTrxId,
        paymentReference: orderNumber,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=KASIRGO-QRIS-${orderNumber}`,
        qrCodeString: `00020101021226600016ID.CO.KASIRGO.WWW01189360091800000000005204581253033605802ID5910KASIRGO6007BANDUNG61054011562210517${orderNumber}6304`,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 menit
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/charge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: this.getAuthHeader(),
        },
        body: JSON.stringify({
          payment_type: "qris",
          transaction_details: {
            order_id: orderNumber,
            gross_amount: Math.round(Number(amount)),
          },
          qris: {
            acquirer: "gopay",
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || data.status_code !== "201") {
        throw new Error(
          data.status_message || "Gagal membuat transaksi QRIS di Midtrans",
        );
      }

      // Ambil QR code URL dari actions
      const qrAction = data.actions?.find((a) => a.name === "generate-qr-code");
      const qrCodeUrl = qrAction?.url || null;
      const qrCodeString = data.qr_string || null;

      return {
        transactionId: data.transaction_id,
        paymentReference: data.order_id,
        qrCodeUrl,
        qrCodeString,
        expiresAt: data.expiry_time
          ? new Date(data.expiry_time)
          : new Date(Date.now() + 15 * 60 * 1000),
      };
    } catch (error) {
      console.error("[Midtrans Service Error]", error);
      throw error;
    }
  }

  /**
   * Validasi Signature Key Webhook dari Midtrans
   */
  verifySignature({ orderId, statusCode, grossAmount, signatureKey }) {
    if (!this.serverKey) return true;

    const payload = `${orderId}${statusCode}${grossAmount}${this.serverKey}`;
    const expectedSignature = crypto
      .createHash("sha512")
      .update(payload)
      .digest("hex");

    return expectedSignature === signatureKey;
  }
}

export default new MidtransService();
