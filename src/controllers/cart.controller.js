import * as cartService from '../services/cart.service.js';

export async function getCart(req, res, next) {
  try {
    const cart = await cartService.getCart(req.user.id);
    res.json({ data: cart });
  } catch (err) {
    next(err);
  }
}

export async function addCartItem(req, res, next) {
  try {
    const cart = await cartService.addOrUpdateCartItem(req.user.id, req.body);
    res.status(201).json({ data: cart });
  } catch (err) {
    next(err);
  }
}

export async function updateCartItem(req, res, next) {
  try {
    const cart = await cartService.updateCartItemQuantity(
      req.user.id,
      req.params.productId,
      req.body.quantity,
      req.body.customText,
      req.body.colorHex
    );
    res.json({ data: cart });
  } catch (err) {
    next(err);
  }
}

export async function removeCartItem(req, res, next) {
  try {
    const cart = await cartService.removeCartItem(
      req.user.id,
      req.params.productId,
      req.query.customText,
      req.query.colorHex
    );
    res.json({ data: cart });
  } catch (err) {
    next(err);
  }
}

export async function clearCart(req, res, next) {
  try {
    const cart = await cartService.clearCart(req.user.id);
    res.json({ data: cart });
  } catch (err) {
    next(err);
  }
}

export async function addCustomCartItem(req, res, next) {
  try {
    const cart = await cartService.addCustomCartItem(req.user.id, req.body);
    res.status(201).json({ data: cart });
  } catch (err) {
    next(err);
  }
}

export async function updateCustomCartItem(req, res, next) {
  try {
    const cart = await cartService.updateCustomCartItemQuantity(
      req.user.id,
      req.params.customItemId,
      req.body.quantity
    );
    res.json({ data: cart });
  } catch (err) {
    next(err);
  }
}

export async function removeCustomCartItem(req, res, next) {
  try {
    const cart = await cartService.removeCustomCartItem(
      req.user.id,
      req.params.customItemId
    );
    res.json({ data: cart });
  } catch (err) {
    next(err);
  }
}
