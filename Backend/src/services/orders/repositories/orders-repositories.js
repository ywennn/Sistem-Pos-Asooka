import pool from "../../../config/database.js";
import { InvariantError, NotFoundError } from "../../../exceptions/index.js";

class OrderRepository {
  /**
   * Helper untuk membuat Order Number: ORD-YYYYMMDD-XXXX
   */
  generateOrderNumber() {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${yyyy}${mm}${dd}-${randomChars}`;
  }

  /**
   * Membuat pesanan lengkap dengan verifikasi harga dari DB
   */
  async createOrder({
    customerName = "Pelanggan",
    source = "CASHIER",
    notes = null,
    cashierId = null,
    kioskSessionId = null,
    discountAmount = 0,
    taxAmount = 0,
    items = [],
  }) {
    if (!items || items.length === 0) {
      throw new InvariantError("Pesanan harus memiliki minimal 1 item produk");
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      let orderSubtotal = 0;
      const preparedItems = [];

      // 1. Validasi & Hitung seluruh item berdasarkan harga dari Database
      for (const item of items) {
        const { productId, quantity = 1, notes: itemNotes, selectedOptionValueIds = [] } = item;

        if (quantity <= 0) {
          throw new InvariantError("Jumlah produk harus lebih dari 0");
        }

        // Ambil data produk langsung dari DB (Anti-manipulasi harga)
        const productRes = await client.query(
          "SELECT id, name, price, is_active, is_available FROM products WHERE id = $1",
          [productId]
        );
        const product = productRes.rows[0];

        if (!product || !product.is_active) {
          throw new NotFoundError(`Produk dengan ID ${productId} tidak ditemukan atau tidak aktif`);
        }
        if (!product.is_available) {
          throw new InvariantError(`Produk '${product.name}' saat ini sedang habis`);
        }

        const productPrice = Number(product.price);
        let optionsTotal = 0;
        const preparedOptions = [];

        // Ambil data opsi dan additional_price langsung dari DB
        if (Array.isArray(selectedOptionValueIds) && selectedOptionValueIds.length > 0) {
          const optionsRes = await client.query(
            `SELECT ov.id AS value_id, ov.name AS value_name, ov.price_delta, ov.is_available,
                    og.id AS group_id, og.name AS group_name
             FROM option_values ov
             JOIN option_groups og ON ov.group_id = og.id
             WHERE ov.id = ANY($1::uuid[])`,
            [selectedOptionValueIds]
          );

          for (const opt of optionsRes.rows) {
            if (!opt.is_available) {
              throw new InvariantError(`Pilihan opsi '${opt.value_name}' sedang tidak tersedia`);
            }
            const addPrice = Number(opt.price_delta);
            optionsTotal += addPrice;

            preparedOptions.push({
              optionGroupId: opt.group_id,
              optionValueId: opt.value_id,
              optionName: opt.group_name,
              optionValueName: opt.value_name,
              additionalPrice: addPrice,
            });
          }
        }

        const itemSubtotal = (productPrice + optionsTotal) * quantity;
        orderSubtotal += itemSubtotal;

        preparedItems.push({
          productId: product.id,
          productName: product.name,
          productPrice,
          optionsTotal,
          quantity,
          subtotal: itemSubtotal,
          notes: itemNotes || null,
          options: preparedOptions,
        });
      }

      // Hitung total akhir
      const numDiscount = Number(discountAmount) || 0;
      const numTax = Number(taxAmount) || 0;
      const totalAmount = Math.max(0, orderSubtotal - numDiscount + numTax);

      let orderNumber = this.generateOrderNumber();
      // Pastikan order_number unik
      const existingRes = await client.query("SELECT id FROM orders WHERE order_number = $1", [orderNumber]);
      if (existingRes.rows.length > 0) {
        orderNumber = this.generateOrderNumber();
      }

      // 2. Simpan ke tabel orders
      const insertOrderQuery = `
        INSERT INTO orders (
          order_number, customer_name, source, status,
          subtotal, discount_amount, tax_amount, total_amount,
          notes, cashier_id, kiosk_session_id
        )
        VALUES ($1, $2, $3, 'PENDING', $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      const orderValues = [
        orderNumber,
        customerName || "Pelanggan",
        source,
        orderSubtotal,
        numDiscount,
        numTax,
        totalAmount,
        notes || null,
        cashierId || null,
        kioskSessionId || null,
      ];
      const { rows: orderRows } = await client.query(insertOrderQuery, orderValues);
      const createdOrder = orderRows[0];

      // 3. Simpan order_items dan order_item_options
      const createdItems = [];
      for (const pItem of preparedItems) {
        const insertItemQuery = `
          INSERT INTO order_items (
            order_id, product_id, product_name, product_price,
            options_total, quantity, subtotal, notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `;
        const itemValues = [
          createdOrder.id,
          pItem.productId,
          pItem.productName,
          pItem.productPrice,
          pItem.optionsTotal,
          pItem.quantity,
          pItem.subtotal,
          pItem.notes,
        ];
        const { rows: itemRows } = await client.query(insertItemQuery, itemValues);
        const createdItem = itemRows[0];

        const createdOptions = [];
        for (const opt of pItem.options) {
          const insertOptionQuery = `
            INSERT INTO order_item_options (
              order_item_id, option_group_id, option_value_id,
              option_name, option_value_name, additional_price
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `;
          const optValues = [
            createdItem.id,
            opt.optionGroupId,
            opt.optionValueId,
            opt.optionName,
            opt.optionValueName,
            opt.additionalPrice,
          ];
          const { rows: optRows } = await client.query(insertOptionQuery, optValues);
          createdOptions.push(optRows[0]);
        }

        createdItems.push({
          ...createdItem,
          options: createdOptions,
        });
      }

      await client.query("COMMIT");

      return {
        ...createdOrder,
        items: createdItems,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Mengambil detail pesanan lengkap beserta items & options
   */
  async getOrderById(id) {
    const orderQuery = `
      SELECT o.*,
             u.name AS cashier_name
      FROM orders o
      LEFT JOIN users u ON o.cashier_id = u.id
      WHERE o.id = $1
    `;
    const { rows: orderRows } = await pool.query(orderQuery, [id]);
    if (!orderRows.length) return null;
    const order = orderRows[0];

    // Ambil items + options
    const itemsQuery = `
      SELECT oi.*,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', oio.id,
                   'option_group_id', oio.option_group_id,
                   'option_value_id', oio.option_value_id,
                   'option_name', oio.option_name,
                   'option_value_name', oio.option_value_name,
                   'additional_price', oio.additional_price
                 ) ORDER BY oio.created_at ASC
               ) FILTER (WHERE oio.id IS NOT NULL),
               '[]'
             ) AS options
      FROM order_items oi
      LEFT JOIN order_item_options oio ON oi.id = oio.order_item_id
      WHERE oi.order_id = $1
      GROUP BY oi.id
      ORDER BY oi.created_at ASC
    `;
    const { rows: itemRows } = await pool.query(itemsQuery, [id]);

    return {
      ...order,
      items: itemRows,
    };
  }

  async getOrderByOrderNumber(orderNumber) {
    const { rows } = await pool.query("SELECT id FROM orders WHERE order_number = $1", [orderNumber]);
    if (!rows.length) return null;
    return this.getOrderById(rows[0].id);
  }

  /**
   * Mengambil daftar pesanan dengan filter
   */
  async getAllOrders({ status, source, cashierId, kioskSessionId, limit = 50, offset = 0 } = {}) {
    let query = `
      SELECT o.*,
             u.name AS cashier_name,
             COUNT(oi.id) AS total_items
      FROM orders o
      LEFT JOIN users u ON o.cashier_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `;
    const values = [];

    if (status) {
      values.push(status);
      query += ` AND o.status = $${values.length}`;
    }
    if (source) {
      values.push(source);
      query += ` AND o.source = $${values.length}`;
    }
    if (cashierId) {
      values.push(cashierId);
      query += ` AND o.cashier_id = $${values.length}`;
    }
    if (kioskSessionId) {
      values.push(kioskSessionId);
      query += ` AND o.kiosk_session_id = $${values.length}`;
    }

    query += `
      GROUP BY o.id, u.name
      ORDER BY o.created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);
    return rows;
  }

  /**
   * Update status pesanan (PENDING, PAID, PROCESSING, COMPLETED, CANCELLED)
   */
  async updateOrderStatus(id, status) {
    let extraSet = "";
    if (status === "PAID") {
      extraSet = ", paid_at = COALESCE(paid_at, NOW())";
    } else if (status === "COMPLETED") {
      extraSet = ", completed_at = NOW()";
    } else if (status === "CANCELLED") {
      extraSet = ", cancelled_at = NOW()";
    }

    const query = `
      UPDATE orders
      SET status = $1, updated_at = NOW() ${extraSet}
      WHERE id = $2
      RETURNING *
    `;
    const { rows } = await pool.query(query, [status, id]);
    if (!rows.length) return null;
    return this.getOrderById(id);
  }
}

export default new OrderRepository();
