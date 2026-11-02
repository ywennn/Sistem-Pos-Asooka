import { Router } from "express";
import validate from "../../../middlewares/validate.js";
import guard from "../../../middlewares/guard.js";
import auth from "../../../middlewares/auth.js";
import { categorySchema, updateCategorySchema } from "../validator/index.js";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controller/categories-controller.js";

const router = Router();

// ================= PUBLIC ROUTES =================
router.get("/categories", getAllCategories);
router.get("/categories/:id", getCategoryById);

// ================= ADMIN ONLY ROUTES =================
router.post(
  "/categories",
  auth,
  guard("ADMIN"),
  validate(categorySchema),
  createCategory,
);

router.put(
  "/categories/:id",
  auth,
  guard("ADMIN"),
  validate(updateCategorySchema),
  updateCategory,
);
router.delete("/categories/:id", auth, guard("ADMIN"), deleteCategory);

export default router;
