import { create } from "zustand";
import { authApi } from "../api";

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem("kasirgo_user") || "null"),
  isAuthenticated: !!localStorage.getItem("kasirgo_user"),

  setUser: (user) => {
    if (user) {
      localStorage.setItem("kasirgo_user", JSON.stringify(user));
      set({ user, isAuthenticated: true });
    } else {
      localStorage.removeItem("kasirgo_user");
      set({ user: null, isAuthenticated: false });
    }
  },

  login: async (email, password) => {
    const res = await authApi.login({ email, password });
    const userData = res.data?.user;
    if (userData) {
      localStorage.setItem("kasirgo_user", JSON.stringify(userData));
      set({ user: userData, isAuthenticated: true });
    }
    return userData;
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem("kasirgo_user");
      set({ user: null, isAuthenticated: false });
    }
  },
}));
