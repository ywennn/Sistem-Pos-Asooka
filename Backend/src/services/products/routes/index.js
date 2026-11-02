import { Router } from "express";
import validate from "../../../middlewares/validate.js";
import guard from "../../../middlewares/guard.js";
import auth from "../../../middlewares/auth.js";
import {
  createProductSchema,
  updateProductSchema,
} from "../validator/index.js";
import {
  getAllProducts,
  getProductById,
  getProductsByCategory,
  getProductsBySubcategory,
  createProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
} from "../controller/products-controller.js";

const router = Router();

// ================= PUBLIC ROUTES =================
router.get("/products", getAllProducts);
router.get("/products/category/:categoryId", getProductsByCategory);
router.get("/products/subcategory/:subcategoryId", getProductsBySubcategory);
router.get("/products/:id", getProductById);

// ================= ADMIN ONLY ROUTES =================
router.post(
  "/products",
  auth,
  guard("ADMIN"),
  validate(createProductSchema),
  createProduct,
);

router.put(
  "/products/:id",
  auth,
  guard("ADMIN"),
  validate(updateProductSchema),
  updateProduct,
);

router.delete("/products/:id", auth, guard("ADMIN"), deleteProduct);
router.put("/products/:id/restore", auth, guard("ADMIN"), restoreProduct);

export default router;
