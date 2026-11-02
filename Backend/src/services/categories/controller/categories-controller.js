import CategoryRepository from "../repositories/categories-repositories.js";
import { InvariantError, NotFoundError } from "../../../exceptions/index.js";
import response from "../../../utils/response.js";

const createCategory = async (req, res, next) => {
  const { name, description, slug } = req.validated;
  try {
    const isCategoryExists =
      await CategoryRepository.isCategoryNameExists(name);
    if (isCategoryExists) {
      return next(new InvariantError("Nama kategori sudah digunakan"));
    }

    const category = await CategoryRepository.createCategory(
      name,
      description,
      slug,
    );
    return response(res, 201, "Kategori berhasil dibuat", { category });
  } catch (error) {
    next(error);
  }
};

const getAllCategories = async (req, res, next) => {
  try {
    const categories = await CategoryRepository.getAllCategories();
    return response(res, 200, "Berhasil mendapatkan semua kategori", {
      categories,
    });
  } catch (error) {
    next(error);
  }
};
const getCategoryById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const category = await CategoryRepository.getCategoryById(id);
    if (!category) {
      return next(new NotFoundError("Kategori tidak ditemukan"));
    }
    return response(res, 200, "Berhasil mendapatkan kategori", { category });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  const { id } = req.params;
  const { name, description, slug } = req.validated;
  try {
    const category = await CategoryRepository.updateCategory(
      id,
      name,
      description,
      slug,
    );
    if (!category) {
      return next(new NotFoundError("Kategori tidak ditemukan"));
    }
    return response(res, 200, "Kategori berhasil diperbarui", { category });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  const { id } = req.params;
  try {
    const category = await CategoryRepository.deleteCategory(id);
    if (!category) {
      return next(new NotFoundError("Kategori tidak ditemukan"));
    }
    return response(res, 200, "Kategori berhasil dihapus", { category });
  } catch (error) {
    next(error);
  }
};

export {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
