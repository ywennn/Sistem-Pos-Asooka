import { Router } from "express";
import validate from "../../../middlewares/validate.js";
import guard from "../../../middlewares/guard.js";
import auth from "../../../middlewares/auth.js";
import {
  createOptionGroupSchema,
  updateOptionGroupSchema,
  createOptionValueSchema,
  updateOptionValueSchema,
  assignProductOptionGroupSchema,
} from "../validator/index.js";
import {
  getAllOptionGroups,
  getOptionGroupById,
  createOptionGroup,
  updateOptionGroup,
  deleteOptionGroup,
  createOptionValue,
  updateOptionValue,
  deleteOptionValue,
  getProductOptionGroups,
  assignOptionGroupToProduct,
  removeOptionGroupFromProduct,
} from "../controller/option-groups-controller.js";

const router = Router();

// ================= OPTION VALUES (Must be above /:id to avoid conflict) =================
router.put(
  "/option-groups/values/:valueId",
  auth,
  guard("ADMIN"),
  validate(updateOptionValueSchema),
  updateOptionValue
);

router.delete(
  "/option-groups/values/:valueId",
  auth,
  guard("ADMIN"),
  deleteOptionValue
);

// ================= OPTION GROUPS (PUBLIC GET) =================
router.get("/option-groups", getAllOptionGroups);
router.get("/option-groups/:id", getOptionGroupById);
router.get("/products/:productId/option-groups", getProductOptionGroups);

router.post(
  "/option-groups",
  auth,
  guard("ADMIN"),
  validate(createOptionGroupSchema),
  createOptionGroup
);

router.put(
  "/option-groups/:id",
  auth,
  guard("ADMIN"),
  validate(updateOptionGroupSchema),
  updateOptionGroup
);

router.delete(
  "/option-groups/:id",
  auth,
  guard("ADMIN"),
  deleteOptionGroup
);

router.post(
  "/option-groups/:groupId/values",
  auth,
  guard("ADMIN"),
  validate(createOptionValueSchema),
  createOptionValue
);

// ================= PRODUCT OPTION GROUPS (ADMIN ASSIGN) =================
router.post(
  "/products/:productId/option-groups",
  auth,
  guard("ADMIN"),
  validate(assignProductOptionGroupSchema),
  assignOptionGroupToProduct
);

router.delete(
  "/products/:productId/option-groups/:groupId",
  auth,
  guard("ADMIN"),
  removeOptionGroupFromProduct
);

export default router;
