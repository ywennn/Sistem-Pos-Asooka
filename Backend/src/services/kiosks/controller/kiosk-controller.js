import KioskRepository from "../repositories/kiosk-repositories.js";
import response from "../../../utils/response.js";
import { InvariantError, NotFoundError } from "../../../exceptions/index.js";

// ================= DEVICE CONTROLLER =================
const registerDevice = async (req, res, next) => {
  try {
    const { deviceName, deviceCode, deviceTokenHash, deviceType } = req.validated;

    const existingDevice = await KioskRepository.getDeviceByCode(deviceCode);
    if (existingDevice) {
      return next(new InvariantError("Kode perangkat sudah terdaftar"));
    }

    const device = await KioskRepository.registerDevice({
      deviceName,
      deviceCode,
      deviceTokenHash,
      deviceType,
    });

    return response(res, 201, "Perangkat kiosk berhasil didaftarkan", {
      device,
    });
  } catch (error) {
    return next(error);
  }
};

const getAllDevices = async (req, res, next) => {
  try {
    const { type, isActive } = req.query;
    const devices = await KioskRepository.getAllDevices({
      type,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
    });

    return response(res, 200, "Berhasil mendapatkan daftar perangkat", {
      devices,
    });
  } catch (error) {
    return next(error);
  }
};

const getDeviceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const device = await KioskRepository.getDeviceById(id);
    if (!device) {
      return next(new NotFoundError("Perangkat tidak ditemukan"));
    }

    return response(res, 200, "Berhasil mendapatkan perangkat", {
      device,
    });
  } catch (error) {
    return next(error);
  }
};

const updateDevice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deviceName, deviceType, isActive } = req.validated;

    const device = await KioskRepository.updateDevice(id, {
      deviceName,
      deviceType,
      isActive,
    });

    if (!device) {
      return next(new NotFoundError("Perangkat tidak ditemukan"));
    }

    return response(res, 200, "Perangkat berhasil diperbarui", {
      device,
    });
  } catch (error) {
    return next(error);
  }
};

// ================= SESSION CONTROLLER =================
const startSession = async (req, res, next) => {
  try {
    const { cashierDeviceId, customerDeviceId } = req.validated;
    const cashierId = req.user.id; // Diambil dari JWT Auth

    // Verifikasi kedua tablet
    const cashierDevice = await KioskRepository.getDeviceById(cashierDeviceId);
    if (!cashierDevice || cashierDevice.device_type !== "CASHIER" || !cashierDevice.is_active) {
      return next(new InvariantError("Perangkat kasir tidak valid atau tidak aktif"));
    }

    const customerDevice = await KioskRepository.getDeviceById(customerDeviceId);
    if (!customerDevice || customerDevice.device_type !== "CUSTOMER" || !customerDevice.is_active) {
      return next(new InvariantError("Perangkat pelanggan tidak valid atau tidak aktif"));
    }

    const session = await KioskRepository.startSession({
      cashierDeviceId,
      customerDeviceId,
      cashierId,
    });

    return response(res, 201, "Sesi kendali kiosk berhasil dimulai", {
      session,
    });
  } catch (error) {
    return next(error);
  }
};

const getActiveSession = async (req, res, next) => {
  try {
    const { deviceId, role } = req.query; // role: CASHIER or CUSTOMER
    let session = null;

    if (role === "CUSTOMER") {
      session = await KioskRepository.getActiveSessionForCustomer(deviceId);
    } else {
      session = await KioskRepository.getActiveSessionForCashier(deviceId);
    }

    if (!session) {
      return response(res, 200, "Tidak ada sesi aktif", { session: null });
    }

    const state = await KioskRepository.getStateBySessionId(session.id);
    return response(res, 200, "Berhasil mendapatkan sesi aktif", {
      session: {
        ...session,
        state,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const endSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await KioskRepository.endSession(sessionId);
    if (!session) {
      return next(new NotFoundError("Sesi aktif tidak ditemukan"));
    }

    return response(res, 200, "Sesi kendali kiosk berhasil diakhiri", {
      session,
    });
  } catch (error) {
    return next(error);
  }
};

// ================= STATE CONTROLLER =================
const getSessionState = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const state = await KioskRepository.getStateBySessionId(sessionId);
    if (!state) {
      return next(new NotFoundError("State sesi tidak ditemukan"));
    }

    return response(res, 200, "Berhasil mendapatkan state sesi", {
      state,
    });
  } catch (error) {
    return next(error);
  }
};

const updateSessionState = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { stateData } = req.validated;

    const state = await KioskRepository.saveState(sessionId, stateData);
    return response(res, 200, "State sesi berhasil diperbarui", {
      state,
    });
  } catch (error) {
    return next(error);
  }
};

export {
  registerDevice,
  getAllDevices,
  getDeviceById,
  updateDevice,
  startSession,
  getActiveSession,
  endSession,
  getSessionState,
  updateSessionState,
};
