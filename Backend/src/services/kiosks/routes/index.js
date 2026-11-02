import { Router } from "express";
import validate from "../../../middlewares/validate.js";
import guard from "../../../middlewares/guard.js";
import auth, { optionalAuth } from "../../../middlewares/auth.js";
import {
  registerDeviceSchema,
  updateDeviceSchema,
  startSessionSchema,
  syncStateSchema,
} from "../validator/index.js";
import {
  registerDevice,
  getAllDevices,
  getDeviceById,
  updateDevice,
  startSession,
  getActiveSession,
  endSession,
  getSessionState,
  updateSessionState,
} from "../controller/kiosk-controller.js";

const router = Router();

// ================= DEVICE MANAGEMENT =================
router.post(
  "/kiosks/devices",
  auth,
  guard("ADMIN"),
  validate(registerDeviceSchema),
  registerDevice
);

router.get("/kiosks/devices", optionalAuth, getAllDevices);
router.get("/kiosks/devices/:id", optionalAuth, getDeviceById);

router.put(
  "/kiosks/devices/:id",
  auth,
  guard("ADMIN"),
  validate(updateDeviceSchema),
  updateDevice
);

// ================= SESSION & STATE MANAGEMENT =================
router.post(
  "/kiosks/sessions",
  auth,
  validate(startSessionSchema),
  startSession
);

router.get("/kiosks/sessions/active", auth, getActiveSession);

router.post("/kiosks/sessions/:sessionId/end", auth, endSession);

router.get("/kiosks/sessions/:sessionId/state", auth, getSessionState);

router.put(
  "/kiosks/sessions/:sessionId/state",
  auth,
  validate(syncStateSchema),
  updateSessionState
);

export default router;
