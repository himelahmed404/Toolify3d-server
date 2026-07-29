import * as customOrdersService from '../services/customOrders.service.js';

export async function createCustomOrder(req, res, next) {
  try {
    const order = await customOrdersService.createCustomOrder(req.user.id, req.body);
    res.status(201).json({ data: order });
  } catch (err) {
    next(err);
  }
}

export async function listCustomOrders(req, res, next) {
  try {
    const orders = await customOrdersService.listCustomOrders(req.user.id);
    res.json({ data: orders });
  } catch (err) {
    next(err);
  }
}

export async function getCustomOrder(req, res, next) {
  try {
    const order = await customOrdersService.getCustomOrderById(req.user.id, req.params.id);
    res.json({ data: order });
  } catch (err) {
    next(err);
  }
}
