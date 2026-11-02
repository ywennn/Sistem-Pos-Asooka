import { Router } from "express";
import validate from "../../../middlewares/validate.js";
import { loginSchema, refreshTokenSchema } from "../validator/index.js";
import { login, refreshToken, logout } from "../controller/auth-controller.js";

const router = Router();
router.post("/auth", validate(loginSchema), login);
router.post("/auth/refresh", validate(refreshTokenSchema), refreshToken);
router.post("/auth/logout", validate(refreshTokenSchema), logout);
export default router;
