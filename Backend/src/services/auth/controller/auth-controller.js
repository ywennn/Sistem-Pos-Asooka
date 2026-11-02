import UserRepository from "../../users/repositories/user-repositories.js";
import AuthRepository from "../repositories/auth-repository.js";
import TokenManager from "../../../security/token-manager.js";
import response from "../../../utils/response.js";
import crypto from "crypto";
import AuditLogService from "../../auditLogs/services/audit-log-service.js";
import {
  InvariantError,
  AuthenticationError,
} from "../../../exceptions/index.js";

const login = async (req, res, next) => {
  const { email, password } = req.validated;
  const user = await UserRepository.verifyCredentials(email, password);
  if (!user) {
    return next(new AuthenticationError("Kredensial yang Anda berikan salah"));
  }
  const accessToken = TokenManager.generateAccessToken({
    id: user.id,
    role: user.role,
  });
  const refreshToken = TokenManager.generateRefreshToken({
    id: user.id,
    role: user.role,
  });
  const refreshPayload = TokenManager.verifyRefreshToken(refreshToken);

  const expiresAt = new Date(refreshPayload.exp * 1000);
  await AuthRepository.addRefreshToken(user.id, refreshToken, expiresAt);
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 1000,
    path: "/",
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  AuditLogService.recordActivity(req, {
    action: "LOGIN",
    module: "AUTH",
    entityType: "USER",
    entityId: user.id,
    description: `User '${user.name}' (${user.email}) berhasil login`,
    userId: user.id,
  });

  return response(res, 200, "Login berhasil", {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
};

const refreshToken = async (req, res, next) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return next(new InvariantError("Refresh token tidak ditemukan"));
  }

  const payload = TokenManager.verifyRefreshToken(refreshToken);
  const oldTokenHash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  const user = await AuthRepository.findActiveRefreshToken(
    payload.id,
    oldTokenHash,
  );
  if (!user) {
    return next(new AuthenticationError("Refresh token tidak valid"));
  }

  const newAccessToken = TokenManager.generateAccessToken({
    id: user.id,
    role: user.role,
  });
  const newRefreshToken = TokenManager.generateRefreshToken({
    id: user.id,
    role: user.role,
  });
  const newRefreshPayload = TokenManager.verifyRefreshToken(newRefreshToken);
  const newExpiresAt = new Date(newRefreshPayload.exp * 1000);
  const rotatedUser = await AuthRepository.rotateRefreshToken(
    user.id,
    refreshToken,
    newRefreshToken,
    newExpiresAt,
  );
  res.cookie("accessToken", newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 1000,
    path: "/",
  });

  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
  return response(res, 200, "Token berhasil diperbarui", {
    user: {
      id: rotatedUser.id,
      name: rotatedUser.name,
      email: rotatedUser.email,
      role: rotatedUser.role,
    },
  });
};

const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await AuthRepository.revokeRefreshToken(refreshToken);
    }

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    };

    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    AuditLogService.recordActivity(req, {
      action: "LOGOUT",
      module: "AUTH",
      entityType: "USER",
      entityId: req.user?.id || null,
      description: "Pengguna logout dari sistem",
    });

    return response(res, 200, "Logout berhasil", null);
  } catch (error) {
    next(error);
  }
};

export { login, refreshToken, logout };
