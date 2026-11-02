import response from "../utils/response.js";
import { ClientError } from "../exceptions/index.js";

const ErrorHandler = (err, req, res, next) => {
  if (err instanceof ClientError) {
    return response(res, err.statusCode, err.message);
  }
  if (err.isJoi) {
    return response(res, 400, err.details[0].message);
  }
  if (err.code && err.code.startsWith("23")) {
    return response(res, 400, "Database error", null);
  }
  const status = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";
  return response(res, status, message, null);
};

export default ErrorHandler;
