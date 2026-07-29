import * as adminService from '../services/admin.service.js';
import * as productsService from '../services/products.service.js';
import * as firebaseStorageService from '../services/firebaseStorage.service.js';

export async function getDashboard(req, res, next) {
  try {
    const data = await adminService.getDashboardData();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function listCustomers(req, res, next) {
  try {
    const data = await adminService.listCustomers({
      search: req.query.search,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function listOrders(req, res, next) {
  try {
    const data = await adminService.listAdminOrders({
      status: req.query.status,
      search: req.query.search,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const data = await adminService.updateOrderStatus({
      orderId: req.params.id,
      type: req.body.type,
      status: req.body.status,
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getFirebaseStorageStats(req, res, next) {
  try {
    const data = await firebaseStorageService.getCustomOrderStorageStats();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function deleteFirebaseStlFiles(req, res, next) {
  try {
    const data = await firebaseStorageService.deleteAllCustomOrderStlFiles();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function deleteAllProducts(req, res, next) {
  try {
    const data = await productsService.deleteAllProducts();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function exportCustomers(req, res, next) {
  try {
    const customers = await adminService.listAllCustomersForExport();
    res.json({ data: { customers } });
  } catch (err) {
    next(err);
  }
}
