import OptionGroupRepository from "../repositories/option-groups-repositories.js";
import response from "../../../utils/response.js";
import { InvariantError, NotFoundError } from "../../../exceptions/index.js";

const getAllOptionGroups = async (req, res, next) => {
  try {
    const includeInactive =
      req.query.includeInactive === "true" && req.user?.role === "ADMIN";
    const optionGroups = await OptionGroupRepository.getAllOptionGroups({
      includeInactive,
    });
    return response(res, 200, "Berhasil mendapatkan semua grup opsi", {
      optionGroups,
    });
  } catch (error) {
    return next(error);
  }
};

const getOptionGroupById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const optionGroup = await OptionGroupRepository.getOptionGroupById(id);
    if (
      !optionGroup ||
      (!optionGroup.is_active && req.user?.role !== "ADMIN")
    ) {
      return next(new NotFoundError("Grup opsi tidak ditemukan"));
    }
    return response(res, 200, "Berhasil mendapatkan grup opsi", {
      optionGroup,
    });
  } catch (error) {
    return next(error);
  }
};

const createOptionGroup = async (req, res, next) => {
  try {
    const {
      name,
      selection,
      isRequired,
      minSelect,
      maxSelect,
      sortOrder,
      values,
    } = req.validated;

    if (minSelect > maxSelect) {
      return next(
        new InvariantError("minSelect tidak boleh lebih besar dari maxSelect"),
      );
    }

    const optionGroup = await OptionGroupRepository.createOptionGroup({
      name,
      selection,
      isRequired,
      minSelect,
      maxSelect,
      sortOrder,
      values,
    });

    return response(res, 201, "Grup opsi berhasil dibuat", {
      optionGroup,
    });
  } catch (error) {
    return next(error);
  }
};

const updateOptionGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      selection,
      isRequired,
      minSelect,
      maxSelect,
      sortOrder,
      isActive,
    } = req.validated;

    const existing = await OptionGroupRepository.getOptionGroupById(id);
    if (!existing) {
      return next(new NotFoundError("Grup opsi tidak ditemukan"));
    }

    const checkMin = minSelect !== undefined ? minSelect : existing.min_select;
    const checkMax = maxSelect !== undefined ? maxSelect : existing.max_select;
    if (checkMin > checkMax) {
      return next(
        new InvariantError("minSelect tidak boleh lebih besar dari maxSelect"),
      );
    }

    const optionGroup = await OptionGroupRepository.updateOptionGroup(id, {
      name,
      selection,
      isRequired,
      minSelect,
      maxSelect,
      sortOrder,
      isActive,
    });

    return response(res, 200, "Grup opsi berhasil diperbarui", {
      optionGroup,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteOptionGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const optionGroup = await OptionGroupRepository.softDeleteOptionGroup(id);
    if (!optionGroup) {
      return next(new NotFoundError("Grup opsi tidak ditemukan"));
    }
    return response(res, 200, "Grup opsi berhasil dihapus", {
      optionGroup,
    });
  } catch (error) {
    return next(error);
  }
};

// ================= OPTION VALUES =================
const createOptionValue = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const groupExists = await OptionGroupRepository.verifyGroupExists(groupId);
    if (!groupExists) {
      return next(new NotFoundError("Grup opsi tidak ditemukan"));
    }

    const { name, priceDelta, isDefault, isAvailable, sortOrder } =
      req.validated;
    const optionValue = await OptionGroupRepository.createOptionValue(groupId, {
      name,
      priceDelta,
      isDefault,
      isAvailable,
      sortOrder,
    });

    return response(res, 201, "Nilai opsi berhasil ditambahkan", {
      optionValue,
    });
  } catch (error) {
    return next(error);
  }
};

const updateOptionValue = async (req, res, next) => {
  try {
    const { valueId } = req.params;
    const existing = await OptionGroupRepository.getOptionValueById(valueId);
    if (!existing) {
      return next(new NotFoundError("Nilai opsi tidak ditemukan"));
    }

    const { name, priceDelta, isDefault, isAvailable, sortOrder } =
      req.validated;
    const optionValue = await OptionGroupRepository.updateOptionValue(valueId, {
      name,
      priceDelta,
      isDefault,
      isAvailable,
      sortOrder,
    });

    return response(res, 200, "Nilai opsi berhasil diperbarui", {
      optionValue,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteOptionValue = async (req, res, next) => {
  try {
    const { valueId } = req.params;
    const optionValue = await OptionGroupRepository.deleteOptionValue(valueId);
    if (!optionValue) {
      return next(new NotFoundError("Nilai opsi tidak ditemukan"));
    }
    return response(res, 200, "Nilai opsi berhasil dihapus", {
      optionValue,
    });
  } catch (error) {
    return next(error);
  }
};

// ================= PRODUCT OPTION GROUPS =================
const getProductOptionGroups = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const productExists =
      await OptionGroupRepository.verifyProductExists(productId);
    if (!productExists) {
      return next(new NotFoundError("Produk tidak ditemukan"));
    }

    const optionGroups =
      await OptionGroupRepository.getProductOptionGroups(productId);
    return response(res, 200, "Berhasil mendapatkan opsi produk", {
      optionGroups,
    });
  } catch (error) {
    return next(error);
  }
};

const assignOptionGroupToProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const productExists =
      await OptionGroupRepository.verifyProductExists(productId);
    if (!productExists) {
      return next(new NotFoundError("Produk tidak ditemukan"));
    }

    const { groupId, sortOrder } = req.validated;
    const groupExists = await OptionGroupRepository.verifyGroupExists(groupId);
    if (!groupExists) {
      return next(new NotFoundError("Grup opsi tidak ditemukan"));
    }

    const result = await OptionGroupRepository.assignOptionGroupToProduct(
      productId,
      groupId,
      sortOrder,
    );

    return response(res, 201, "Grup opsi berhasil dikaitkan ke produk", {
      assignment: result,
    });
  } catch (error) {
    return next(error);
  }
};

const removeOptionGroupFromProduct = async (req, res, next) => {
  try {
    const { productId, groupId } = req.params;
    const result = await OptionGroupRepository.removeOptionGroupFromProduct(
      productId,
      groupId,
    );
    if (!result) {
      return next(
        new NotFoundError("Kaitan produk dan grup opsi tidak ditemukan"),
      );
    }

    return response(res, 200, "Grup opsi berhasil dilepas dari produk", {
      assignment: result,
    });
  } catch (error) {
    return next(error);
  }
};

export {
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
};
