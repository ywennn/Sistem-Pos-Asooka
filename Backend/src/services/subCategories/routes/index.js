import { Router } from "express";
import validate from "../../../middlewares/validate.js";
import guard from "../../../middlewares/guard.js";
import auth from "../../../middlewares/auth.js";
import { subCategorySchema, updateSubCategorySchema } from "../validator/index.js";
import {
  createSubCategory,
  getAllSubCategories,
  getSubCategoryById,
  getSubCategoriesByCategoryId,
  updateSubCategory,
  deleteSubCategory,
} from "../controller/subcategories-controller.js";

const router = Router();

// ================= PUBLIC ROUTES =================
router.get("/subcategories", getAllSubCategories);
router.get("/subcategories/category/:categoryId", getSubCategoriesByCategoryId);
router.get("/subcategories/:id", getSubCategoryById);

// ================= ADMIN ONLY ROUTES =================
router.post(
  "/subcategories",
  auth,
  guard("ADMIN"),
  validate(subCategorySchema),
  createSubCategory,
);

router.put(
  "/subcategories/:id",
  auth,
  guard("ADMIN"),
  validate(updateSubCategorySchema),
  updateSubCategory,
);
router.delete("/subcategories/:id", auth, guard("ADMIN"), deleteSubCategory);

export default router;
