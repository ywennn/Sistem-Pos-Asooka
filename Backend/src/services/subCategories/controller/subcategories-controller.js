import SubCategoryRepository from "../repositories/subcategories-repositories.js";
import response from "../../../utils/response.js";
import { InvariantError, NotFoundError } from "../../../exceptions/index.js";

const getAllSubCategories = async (req, res, next) => {
  try {
    const subcategories = await SubCategoryRepository.getAllSubCategories();
    return response(res, 200, "Berhasil mendapatkan semua subkategori", {
      subcategories,
    });
  } catch (error) {
    return next(error);
  }
};

const createSubCategory = async (req, res, next) => {
  try {
    const { name, categoryId, slug } = req.validated;

    const categoryExists =
      await SubCategoryRepository.verifyCategoryExists(categoryId);
    if (!categoryExists) {
      return next(new NotFoundError("Kategori tidak ditemukan"));
    }

    const slugExists = await SubCategoryRepository.isSlugExists(slug);
    if (slugExists) {
      return next(new InvariantError("Slug sudah digunakan"));
    }

    const subcategory = await SubCategoryRepository.createSubCategory(
      name,
      categoryId,
      slug,
    );
    return response(res, 201, "Berhasil membuat subkategori", {
      subcategory,
    });
  } catch (error) {
    return next(error);
  }
};

const getSubCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const subcategory = await SubCategoryRepository.getSubCategoryById(id);
    if (!subcategory) {
      return next(new NotFoundError("Subkategori tidak ditemukan"));
    }
    return response(res, 200, "Berhasil mendapatkan subkategori", {
      subcategory,
    });
  } catch (error) {
    return next(error);
  }
};

const getSubCategoriesByCategoryId = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    const categoryExists =
      await SubCategoryRepository.verifyCategoryExists(categoryId);
    if (!categoryExists) {
      return next(new NotFoundError("Kategori tidak ditemukan"));
    }

    const subcategories =
      await SubCategoryRepository.getSubCategoriesByCategoryId(categoryId);
    return response(res, 200, "Berhasil mendapatkan subkategori", {
      subcategories,
    });
  } catch (error) {
    return next(error);
  }
};

const updateSubCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, categoryId, slug } = req.validated;

    if (categoryId) {
      const categoryExists =
        await SubCategoryRepository.verifyCategoryExists(categoryId);
      if (!categoryExists) {
        return next(new NotFoundError("Kategori tidak ditemukan"));
      }
    }

    if (slug) {
      const slugExists = await SubCategoryRepository.isSlugExists(slug, id);
      if (slugExists) {
        return next(new InvariantError("Slug sudah digunakan"));
      }
    }

    const subcategory = await SubCategoryRepository.updateSubCategory(
      id,
      name,
      categoryId,
      slug,
    );
    if (!subcategory) {
      return next(new NotFoundError("Subkategori tidak ditemukan"));
    }
    return response(res, 200, "Berhasil memperbarui subkategori", {
      subcategory,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteSubCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const subcategory = await SubCategoryRepository.deleteSubCategory(id);
    if (!subcategory) {
      return next(new NotFoundError("Subkategori tidak ditemukan"));
    }
    return response(res, 200, "Berhasil menghapus subkategori", {
      subcategory,
    });
  } catch (error) {
    return next(error);
  }
};

export {
  getAllSubCategories,
  createSubCategory,
  getSubCategoryById,
  getSubCategoriesByCategoryId,
  updateSubCategory,
  deleteSubCategory,
};
