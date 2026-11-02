import UserRepository from "../repositories/user-repositories.js";
import response from "../../../utils/response.js";
import { InvariantError } from "../../../exceptions/index.js";
const createUser = async (req, res, next) => {
  const { name, email, password, role } = req.validated;

  const isAvailable = await UserRepository.verifyAvailability(email);
  if (!isAvailable) {
    return next(new InvariantError("Email sudah digunakan"));
  }
  const user = await UserRepository.createUser({ name, email, password, role });
  return response(res, 201, "User berhasil dibuat", user);
};

export { createUser };
