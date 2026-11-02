import KioskRepository from "../repositories/kiosk-repositories.js";

/**
 * Inisialisasi Socket.IO Handler untuk Kiosk Management
 * Tablet A (Cashier) mengendalikan Tablet B (Customer)
 */
export const setupKioskSocket = (io) => {
  const kioskNamespace = io.of("/kiosk");

  kioskNamespace.on("connection", (socket) => {
    console.log(`[Kiosk Socket] Perangkat terhubung: ${socket.id}`);

    /**
     * Event: Bergabung ke Room Sesi
     * Payload: { sessionId, deviceId, deviceType }
     */
    socket.on("kiosk:join", async ({ sessionId, deviceId, deviceType }) => {
      try {
        if (!sessionId || !deviceId) {
          return socket.emit("kiosk:error", { message: "sessionId dan deviceId wajib diisi" });
        }

        const roomName = `session:${sessionId}`;
        socket.join(roomName);
        socket.sessionId = sessionId;
        socket.deviceId = deviceId;
        socket.deviceType = deviceType;

        // Update waktu terakhir perangkat aktif
        await KioskRepository.updateDeviceLastSeen(deviceId);

        console.log(`[Kiosk Socket] ${deviceType} (${deviceId}) bergabung ke ${roomName}`);

        // Beritahu anggota room bahwa perangkat telah terhubung
        socket.to(roomName).emit("kiosk:peer-status", {
          deviceId,
          deviceType,
          status: "CONNECTED",
          timestamp: new Date().toISOString(),
        });

        // Jika tablet customer baru join atau reconnect, kirimkan state terkini
        if (deviceType === "CUSTOMER") {
          const currentState = await KioskRepository.getStateBySessionId(sessionId);
          if (currentState) {
            socket.emit("kiosk:restore-state", {
              state: currentState.state_data,
              version: currentState.version,
            });
          }
        }
      } catch (error) {
        console.error("[Kiosk Socket] Error pada kiosk:join:", error);
        socket.emit("kiosk:error", { message: "Gagal bergabung ke sesi" });
      }
    });

    /**
     * Event: Sinkronisasi Aksi dari Tablet Kasir ke Tablet Pelanggan
     * Payload: {
     *   sessionId,
     *   actionType: 'NAVIGATE' | 'SCROLL' | 'PRODUCT_SELECT' | 'CART_UPDATE' | 'CHECKOUT_STEP' | 'RESET',
     *   payload: { ... },
     *   fullStateSnapshot: { ... } // opsional untuk auto-recovery
     * }
     */
    socket.on("kiosk:sync-action", async (data) => {
      try {
        const { sessionId, actionType, payload, fullStateSnapshot } = data;

        if (!sessionId || !actionType) {
          return socket.emit("kiosk:error", { message: "sessionId dan actionType wajib diisi" });
        }

        const roomName = `session:${sessionId}`;

        // Kirimkan aksi secara realtime ke Tablet Pelanggan (dan peer lain di room)
        socket.to(roomName).emit("kiosk:sync-event", {
          actionType,
          payload,
          timestamp: new Date().toISOString(),
        });

        // Simpan snapshot state ke kiosk_states agar bisa dipulihkan jika koneksi putus
        if (fullStateSnapshot) {
          await KioskRepository.saveState(sessionId, fullStateSnapshot);
        }
      } catch (error) {
        console.error("[Kiosk Socket] Error pada kiosk:sync-action:", error);
      }
    });

    /**
     * Event: Tablet Pelanggan Meminta State Terbaru (Manual / Reconnect Recovery)
     */
    socket.on("kiosk:request-state", async ({ sessionId }) => {
      try {
        const targetSessionId = sessionId || socket.sessionId;
        if (!targetSessionId) return;

        const stateRecord = await KioskRepository.getStateBySessionId(targetSessionId);
        if (stateRecord) {
          socket.emit("kiosk:restore-state", {
            state: stateRecord.state_data,
            version: stateRecord.version,
          });
        }
      } catch (error) {
        console.error("[Kiosk Socket] Error pada kiosk:request-state:", error);
      }
    });

    /**
     * Event: Akhiri Sesi Realtime
     */
    socket.on("kiosk:end-session", async ({ sessionId }) => {
      try {
        const targetSessionId = sessionId || socket.sessionId;
        if (!targetSessionId) return;

        const roomName = `session:${targetSessionId}`;
        await KioskRepository.endSession(targetSessionId);

        kioskNamespace.to(roomName).emit("kiosk:session-ended", {
          sessionId: targetSessionId,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("[Kiosk Socket] Error pada kiosk:end-session:", error);
      }
    });

    /**
     * Disconnect handler
     */
    socket.on("disconnect", () => {
      if (socket.sessionId && socket.deviceId) {
        const roomName = `session:${socket.sessionId}`;
        socket.to(roomName).emit("kiosk:peer-status", {
          deviceId: socket.deviceId,
          deviceType: socket.deviceType,
          status: "DISCONNECTED",
          timestamp: new Date().toISOString(),
        });
      }
      console.log(`[Kiosk Socket] Perangkat terputus: ${socket.id}`);
    });
  });
};
