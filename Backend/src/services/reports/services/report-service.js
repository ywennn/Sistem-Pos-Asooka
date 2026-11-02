import ReportRepository from "../repositories/report-repository.js";

class ReportService {
  resolveDateRange({ startDate, endDate, start_date, end_date, period }) {
    const sDate = startDate || start_date;
    const eDate = endDate || end_date;

    const now = new Date();

    if (period === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }

    if (period === "yesterday") {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
      const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }

    if (period === "this_week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);
      return { startDate: start.toISOString(), endDate: new Date().toISOString() };
    }

    if (period === "this_month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      return { startDate: start.toISOString(), endDate: new Date().toISOString() };
    }

    if (period === "last_month") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }

    let parsedStart = null;
    let parsedEnd = null;

    if (sDate) {
      const dt = new Date(sDate);
      dt.setHours(0, 0, 0, 0);
      parsedStart = dt.toISOString();
    }
    if (eDate) {
      const dt = new Date(eDate);
      dt.setHours(23, 59, 59, 999);
      parsedEnd = dt.toISOString();
    }

    return { startDate: parsedStart, endDate: parsedEnd };
  }

  async getDashboard(queryParams) {
    const { startDate, endDate } = this.resolveDateRange(queryParams);
    const summary = await ReportRepository.getDashboardSummary({ startDate, endDate });
    const bestSelling = await ReportRepository.getBestSellingProducts({ startDate, endDate, limit: 5 });
    const paymentStats = await ReportRepository.getPaymentMethodStats({ startDate, endDate });

    return {
      period: { startDate, endDate },
      summary,
      bestSelling,
      paymentStats,
    };
  }

  async getSalesReport(queryParams) {
    const { startDate, endDate } = this.resolveDateRange(queryParams);
    const dailySales = await ReportRepository.getSalesReport({ startDate, endDate });
    const summary = await ReportRepository.getDashboardSummary({ startDate, endDate });

    return {
      period: { startDate, endDate },
      summary,
      dailySales,
    };
  }

  async getBestSelling(queryParams) {
    const { startDate, endDate } = this.resolveDateRange(queryParams);
    const limit = Number(queryParams.limit) || 10;
    const products = await ReportRepository.getBestSellingProducts({ startDate, endDate, limit });

    return {
      period: { startDate, endDate },
      products,
    };
  }

  async getPaymentStats(queryParams) {
    const { startDate, endDate } = this.resolveDateRange(queryParams);
    const stats = await ReportRepository.getPaymentMethodStats({ startDate, endDate });

    return {
      period: { startDate, endDate },
      stats,
    };
  }

  async getTransactions(queryParams) {
    const { startDate, endDate } = this.resolveDateRange(queryParams);
    const limit = Number(queryParams.limit) || 50;
    const page = Number(queryParams.page) || 1;
    const offset = (page - 1) * limit;

    const { transactions, totalCount } = await ReportRepository.getTransactionHistory({
      startDate,
      endDate,
      limit,
      offset,
    });

    return {
      period: { startDate, endDate },
      pagination: {
        page,
        limit,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
      transactions,
    };
  }

  async exportReport(queryParams) {
    const { startDate, endDate } = this.resolveDateRange(queryParams);
    const format = queryParams.format || "pdf";

    const summary = await ReportRepository.getDashboardSummary({ startDate, endDate });
    const paymentStats = await ReportRepository.getPaymentMethodStats({ startDate, endDate });
    const bestSelling = await ReportRepository.getBestSellingProducts({ startDate, endDate, limit: 20 });
    const { transactions } = await ReportRepository.getTransactionHistory({ startDate, endDate, limit: 200 });

    if (format === "csv") {
      let csv = "Order Number,Customer,Total Amount,Payment Method,Date,Cashier\n";
      for (const t of transactions) {
        csv += `"${t.order_number}","${t.customer_name}",${t.total_amount},"${t.payment_method || '-'}","${t.paid_at}","${t.cashier_name || '-'}"\n`;
      }
      return { contentType: "text/csv", filename: `sales-report-${Date.now()}.csv`, content: csv };
    }

    const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Penjualan KasirGo</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 30px; color: #333; line-height: 1.5; }
    .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }
    .header h1 { margin: 0; color: #2563eb; }
    .kpi-container { display: flex; justify-content: space-between; margin-bottom: 25px; }
    .kpi-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; width: 22%; text-align: center; background: #f9fafb; }
    .kpi-card h3 { margin: 0 0 8px 0; font-size: 14px; color: #6b7280; }
    .kpi-card p { margin: 0; font-size: 20px; font-weight: bold; color: #111827; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
    th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
    th { background: #f3f4f6; color: #374151; }
    .section-title { font-size: 16px; margin-bottom: 10px; color: #1f2937; border-left: 4px solid #2563eb; padding-left: 8px; }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>KasirGo - Laporan Penjualan</h1>
    <p>Periode: ${startDate ? new Date(startDate).toLocaleDateString("id-ID") : "Awal"} s/d ${endDate ? new Date(endDate).toLocaleDateString("id-ID") : "Sekarang"}</p>
  </div>

  <div class="kpi-container">
    <div class="kpi-card">
      <h3>Total Pendapatan</h3>
      <p>Rp ${Number(summary.total_revenue).toLocaleString("id-ID")}</p>
    </div>
    <div class="kpi-card">
      <h3>Total Transaksi</h3>
      <p>${summary.total_transactions}</p>
    </div>
    <div class="kpi-card">
      <h3>Produk Terjual</h3>
      <p>${summary.total_items_sold} item</p>
    </div>
    <div class="kpi-card">
      <h3>Rata-rata Transaksi</h3>
      <p>Rp ${Number(summary.average_order_value).toLocaleString("id-ID")}</p>
    </div>
  </div>

  <div class="section-title">Metode Pembayaran</div>
  <table>
    <thead>
      <tr>
        <th>Metode</th>
        <th>Jumlah Transaksi</th>
        <th>Total Nominal</th>
        <th>Persentase</th>
      </tr>
    </thead>
    <tbody>
      ${paymentStats.map((p) => `
        <tr>
          <td><b>${p.payment_method}</b></td>
          <td>${p.transaction_count}</td>
          <td>Rp ${Number(p.total_amount).toLocaleString("id-ID")}</td>
          <td>${p.percentage}%</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="section-title">Produk Paling Laris</div>
  <table>
    <thead>
      <tr>
        <th>Nama Produk</th>
        <th>Kategori</th>
        <th>Harga</th>
        <th>Total Terjual</th>
        <th>Total Pendapatan</th>
      </tr>
    </thead>
    <tbody>
      ${bestSelling.map((b) => `
        <tr>
          <td>${b.product_name}</td>
          <td>${b.category_name}</td>
          <td>Rp ${Number(b.product_price).toLocaleString("id-ID")}</td>
          <td>${b.total_sold}</td>
          <td>Rp ${Number(b.total_revenue).toLocaleString("id-ID")}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
</body>
</html>
    `;

    return { contentType: "text/html", filename: `sales-report-${Date.now()}.html`, content: html };
  }
}

export default new ReportService();
