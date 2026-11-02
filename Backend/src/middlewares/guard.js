import { AuthorizationError } from "../exceptions/index.js";

const authorization = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Pastikan authentication sudah dijalankan
      if (!req.user) {
        throw new AuthorizationError("Akses tidak diizinkan");
      }

      // Periksa role pengguna
      if (!allowedRoles.includes(req.user.role)) {
        throw new AuthorizationError(
          "Anda tidak memiliki izin untuk mengakses resource ini",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default authorization;
