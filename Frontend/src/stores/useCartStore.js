import { create } from "zustand";

export const useCartStore = create((set, get) => ({
  items: [],
  customerName: "Pelanggan",
  discountAmount: 0,
  taxAmount: 0,
  notes: "",

  setCustomerName: (customerName) => set({ customerName }),
  setDiscountAmount: (discountAmount) => set({ discountAmount: Number(discountAmount) || 0 }),
  setTaxAmount: (taxAmount) => set({ taxAmount: Number(taxAmount) || 0 }),
  setNotes: (notes) => set({ notes }),

  addItem: (product, quantity = 1, selectedOptions = [], itemNotes = "") => {
    const optionsTotal = selectedOptions.reduce((acc, opt) => acc + Number(opt.priceDelta || 0), 0);
    const unitPrice = Number(product.price) + optionsTotal;
    const subtotal = unitPrice * quantity;

    // Generate unique key based on productId + selected option value IDs
    const optionKey = selectedOptions
      .map((o) => o.valueId)
      .sort()
      .join("-");
    const cartItemId = `${product.id}_${optionKey}`;

    const existingIndex = get().items.findIndex((item) => item.cartItemId === cartItemId);

    if (existingIndex > -1) {
      const updated = [...get().items];
      updated[existingIndex].quantity += quantity;
      updated[existingIndex].subtotal =
        (Number(product.price) + optionsTotal) * updated[existingIndex].quantity;
      set({ items: updated });
    } else {
      const newItem = {
        cartItemId,
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        optionsTotal,
        quantity,
        subtotal,
        selectedOptions,
        notes: itemNotes,
      };
      set({ items: [...get().items, newItem] });
    }
  },

  updateQuantity: (cartItemId, newQuantity) => {
    if (newQuantity <= 0) {
      get().removeItem(cartItemId);
      return;
    }
    const updated = get().items.map((item) => {
      if (item.cartItemId === cartItemId) {
        return {
          ...item,
          quantity: newQuantity,
          subtotal: (item.price + item.optionsTotal) * newQuantity,
        };
      }
      return item;
    });
    set({ items: updated });
  },

  removeItem: (cartItemId) => {
    set({ items: get().items.filter((item) => item.cartItemId !== cartItemId) });
  },

  clearCart: () => {
    set({
      items: [],
      customerName: "Pelanggan",
      discountAmount: 0,
      taxAmount: 0,
      notes: "",
    });
  },

  // Computed getters
  getSubtotal: () => get().items.reduce((acc, item) => acc + item.subtotal, 0),
  getTotal: () => {
    const sub = get().getSubtotal();
    return Math.max(0, sub - get().discountAmount + get().taxAmount);
  },
  getTotalQuantity: () => get().items.reduce((acc, item) => acc + item.quantity, 0),
}));
