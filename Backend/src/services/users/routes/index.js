import { Router } from "express";
import validate from "../../../middlewares/validate.js";
import { createUser } from "../controller/user-controller.js";
import { userSchema } from "../validator/index.js";
const router = Router();
router.post("/users", validate(userSchema), createUser);
export default router;
