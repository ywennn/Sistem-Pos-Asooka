import TokenManager from "../security/token-manager.js";
import { AuthenticationError } from "../exceptions/index.js";

async function auth(req, res, next) {
  const token = req.cookies?.accessToken;
  try {
    if (!token) {
      return next(new AuthenticationError("Access token tidak ditemukan"));
    }
    const payload = TokenManager.verify(token, process.env.ACCESS_TOKEN_KEY);
    req.user = payload;

    next();
  } catch (error) {
    return next(error);
  }
}

export function optionalAuth(req, res, next) {
  const token = req.cookies?.accessToken;
  if (!token) {
    return next();
  }
  try {
    const payload = TokenManager.verify(token, process.env.ACCESS_TOKEN_KEY);
    req.user = payload;
  } catch {
    // Abaikan jika token invalid atau expired untuk akses opsional
  }
  next();
}

export default auth;
