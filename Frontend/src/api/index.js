import apiClient from "./axios-client.js";

export const authApi = {
  login: async (credentials) => {
    const res = await apiClient.post("/auth", credentials);
    return res.data;
  },
  logout: async () => {
    const res = await apiClient.post("/auth/logout");
    return res.data;
  },
  refreshToken: async () => {
    const res = await apiClient.post("/auth/refresh");
    return res.data;
  },
};

export const productsApi = {
  getCategories: async () => {
    const res = await apiClient.get("/categories");
    return res.data?.data?.categories || [];
  },
  getSubCategories: async (categoryId) => {
    const url = categoryId
      ? `/subcategories/category/${categoryId}`
      : "/subcategories";
    const res = await apiClient.get(url);
    return res.data?.data?.subcategories || [];
  },
  getProducts: async () => {
    const res = await apiClient.get("/products");
    return res.data?.data?.products || [];
  },
  getProductOptionGroups: async (productId) => {
    const res = await apiClient.get(`/products/${productId}/option-groups`);
    return res.data?.data?.optionGroups || [];
  },
};

export const ordersApi = {
  createOrder: async (orderPayload) => {
    const res = await apiClient.post("/orders", orderPayload);
    return res.data?.data?.order;
  },
  getOrderById: async (id) => {
    const res = await apiClient.get(`/orders/${id}`);
    return res.data?.data?.order;
  },
  getAllOrders: async (params) => {
    const res = await apiClient.get("/orders", { params });
    return res.data?.data?.orders || [];
  },
  updateOrderStatus: async (id, status) => {
    const res = await apiClient.patch(`/orders/${id}/status`, { status });
    return res.data?.data?.order;
  },
};

export const paymentsApi = {
  createPayment: async ({ orderId, paymentMethod }) => {
    const res = await apiClient.post("/payments", { orderId, paymentMethod });
    return res.data?.data?.payment;
  },
  confirmCashPayment: async (paymentId, amountTendered) => {
    const res = await apiClient.post(`/payments/${paymentId}/confirm-cash`, {
      amountTendered,
    });
    return res.data?.data;
  },
  getPaymentByOrderId: async (orderId) => {
    const res = await apiClient.get(`/payments/order/${orderId}`);
    return res.data?.data?.payment;
  },
};

export const kiosksApi = {
  getDevices: async (type) => {
    const res = await apiClient.get("/kiosks/devices", {
      params: { type, isActive: true },
    });
    return res.data?.data?.devices || [];
  },
  startSession: async ({ cashierDeviceId, customerDeviceId }) => {
    const res = await apiClient.post("/kiosks/sessions", {
      cashierDeviceId,
      customerDeviceId,
    });
    return res.data?.data?.session;
  },
  getActiveSession: async ({ deviceId, role }) => {
    const res = await apiClient.get("/kiosks/sessions/active", {
      params: { deviceId, role },
    });
    return res.data?.data?.session;
  },
  endSession: async (sessionId) => {
    const res = await apiClient.post(`/kiosks/sessions/${sessionId}/end`);
    return res.data?.data?.session;
  },
};

export const reportsApi = {
  getDashboard: async (params) => {
    const res = await apiClient.get("/reports/dashboard", { params });
    return res.data?.data;
  },
  getSalesReport: async (params) => {
    const res = await apiClient.get("/reports/sales", { params });
    return res.data?.data;
  },
  getBestSelling: async (params) => {
    const res = await apiClient.get("/reports/best-selling", { params });
    return res.data?.data;
  },
  getPayments: async (params) => {
    const res = await apiClient.get("/reports/payments", { params });
    return res.data?.data;
  },
  getTransactions: async (params) => {
    const res = await apiClient.get("/reports/transactions", { params });
    return res.data?.data;
  },
};
