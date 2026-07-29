import * as ordersService from '../services/orders.service.js';

export async function createOrder(req, res, next) {
  try {
    const order = await ordersService.createOrderFromCart(req.user.id, req.body);
    res.status(201).json({ data: order });
  } catch (err) {
    next(err);
  }
}

export async function listOrders(req, res, next) {
  try {
    const orders = await ordersService.listOrders(req.user.id, {
      status: req.query.status,
    });
    res.json({ data: orders });
  } catch (err) {
    next(err);
  }
}

export async function getOrder(req, res, next) {
  try {
    const order = await ordersService.getOrderById(req.user.id, req.params.id);
    res.json({ data: order });
  } catch (err) {
    next(err);
  }
}
