import ProductRepository from "../repositories/products-repositories.js";
import response from "../../../utils/response.js";
import { InvariantError, NotFoundError } from "../../../exceptions/index.js";
import AuditLogService from "../../auditLogs/services/audit-log-service.js";

const getAllProducts = async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === "true" && req.user?.role === "ADMIN";
    const products = await ProductRepository.getAllProducts({ includeInactive });
    return response(res, 200, "Berhasil mendapatkan semua produk", {
      products,
    });
  } catch (error) {
    return next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await ProductRepository.getProductById(id);
    if (!product || (!product.is_active && req.user?.role !== "ADMIN")) {
      return next(new NotFoundError("Produk tidak ditemukan"));
    }
    return response(res, 200, "Berhasil mendapatkan produk", {
      product,
    });
  } catch (error) {
    return next(error);
  }
};

const getProductsByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const categoryExists = await ProductRepository.verifyCategoryExists(categoryId);
    if (!categoryExists) {
      return next(new NotFoundError("Kategori tidak ditemukan"));
    }

    const includeInactive = req.query.includeInactive === "true" && req.user?.role === "ADMIN";
    const products = await ProductRepository.getProductsByCategoryId(categoryId, { includeInactive });
    return response(res, 200, "Berhasil mendapatkan produk berdasarkan kategori", {
      products,
    });
  } catch (error) {
    return next(error);
  }
};

const getProductsBySubcategory = async (req, res, next) => {
  try {
    const { subcategoryId } = req.params;
    const includeInactive = req.query.includeInactive === "true" && req.user?.role === "ADMIN";
    const products = await ProductRepository.getProductsBySubcategoryId(subcategoryId, { includeInactive });
    return response(res, 200, "Berhasil mendapatkan produk berdasarkan subkategori", {
      products,
    });
  } catch (error) {
    return next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      categoryId,
      subcategoryId,
      description,
      price,
      imageUrl,
      sortOrder,
    } = req.validated;

    const categoryExists = await ProductRepository.verifyCategoryExists(categoryId);
    if (!categoryExists) {
      return next(new NotFoundError("Kategori tidak ditemukan"));
    }

    if (subcategoryId) {
      const isSubcategoryValid = await ProductRepository.verifySubcategoryBelongsToCategory(
        subcategoryId,
        categoryId
      );
      if (!isSubcategoryValid) {
        return next(
          new InvariantError("Subkategori tidak valid atau tidak termasuk dalam kategori yang dipilih")
        );
      }
    }

    const product = await ProductRepository.createProduct({
      name,
      categoryId,
      subcategoryId,
      description,
      price,
      imageUrl,
      sortOrder,
    });

    AuditLogService.recordActivity(req, {
      action: "CREATE",
      module: "PRODUCTS",
      entityType: "PRODUCT",
      entityId: product.id,
      description: `Menambahkan produk baru '${product.name}'`,
      newData: product,
    });

    return response(res, 201, "Produk berhasil dibuat", {
      product,
    });
  } catch (error) {
    return next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      categoryId,
      subcategoryId,
      description,
      price,
      imageUrl,
      isAvailable,
      sortOrder,
    } = req.validated;

    const existingProduct = await ProductRepository.getProductById(id);
    if (!existingProduct) {
      return next(new NotFoundError("Produk tidak ditemukan"));
    }

    const targetCategoryId = categoryId || existingProduct.category_id;
    if (categoryId) {
      const categoryExists = await ProductRepository.verifyCategoryExists(targetCategoryId);
      if (!categoryExists) {
        return next(new NotFoundError("Kategori tidak ditemukan"));
      }
    }

    const targetSubcategoryId =
      subcategoryId !== undefined ? subcategoryId : existingProduct.subcategory_id;

    if (targetSubcategoryId) {
      const isSubcategoryValid = await ProductRepository.verifySubcategoryBelongsToCategory(
        targetSubcategoryId,
        targetCategoryId
      );
      if (!isSubcategoryValid) {
        return next(
          new InvariantError("Subkategori tidak valid atau tidak termasuk dalam kategori yang dipilih")
        );
      }
    }

    const product = await ProductRepository.updateProduct(id, {
      name,
      categoryId,
      subcategoryId,
      description,
      price,
      imageUrl,
      isAvailable,
      sortOrder,
    });

    AuditLogService.recordActivity(req, {
      action: "UPDATE",
      module: "PRODUCTS",
      entityType: "PRODUCT",
      entityId: id,
      description: `Memperbarui data produk '${existingProduct.name}'`,
      oldData: { name: existingProduct.name, price: existingProduct.price, is_available: existingProduct.is_available },
      newData: { name: product.name, price: product.price, is_available: product.is_available },
    });

    return response(res, 200, "Produk berhasil diperbarui", {
      product,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await ProductRepository.softDeleteProduct(id);
    if (!product) {
      return next(new NotFoundError("Produk tidak ditemukan"));
    }

    AuditLogService.recordActivity(req, {
      action: "DELETE",
      module: "PRODUCTS",
      entityType: "PRODUCT",
      entityId: id,
      description: `Menonaktifkan produk ID ${id}`,
      oldData: product,
    });

    return response(res, 200, "Produk berhasil dihapus", {
      product,
    });
  } catch (error) {
    return next(error);
  }
};

const restoreProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await ProductRepository.restoreProduct(id);
    if (!product) {
      return next(new NotFoundError("Produk tidak ditemukan"));
    }
    return response(res, 200, "Produk berhasil dipulihkan", {
      product,
    });
  } catch (error) {
    return next(error);
  }
};

export {
  getAllProducts,
  getProductById,
  getProductsByCategory,
  getProductsBySubcategory,
  createProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
};
