import ReportService from "../services/report-service.js";
import response from "../../../utils/response.js";

const getDashboard = async (req, res, next) => {
  try {
    const data = await ReportService.getDashboard(req.query);
    return response(res, 200, "Berhasil mendapatkan ringkasan dashboard", data);
  } catch (error) {
    return next(error);
  }
};

const getSales = async (req, res, next) => {
  try {
    const data = await ReportService.getSalesReport(req.query);
    return response(res, 200, "Berhasil mendapatkan laporan penjualan", data);
  } catch (error) {
    return next(error);
  }
};

const getBestSelling = async (req, res, next) => {
  try {
    const data = await ReportService.getBestSelling(req.query);
    return response(res, 200, "Berhasil mendapatkan produk paling laris", data);
  } catch (error) {
    return next(error);
  }
};

const getPayments = async (req, res, next) => {
  try {
    const data = await ReportService.getPaymentStats(req.query);
    return response(res, 200, "Berhasil mendapatkan statistik pembayaran", data);
  } catch (error) {
    return next(error);
  }
};

const getTransactions = async (req, res, next) => {
  try {
    const data = await ReportService.getTransactions(req.query);
    return response(res, 200, "Berhasil mendapatkan riwayat transaksi", data);
  } catch (error) {
    return next(error);
  }
};

const exportReport = async (req, res, next) => {
  try {
    const { contentType, filename, content } = await ReportService.exportReport(req.query);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(content);
  } catch (error) {
    return next(error);
  }
};

export {
  getDashboard,
  getSales,
  getBestSelling,
  getPayments,
  getTransactions,
  exportReport,
};
