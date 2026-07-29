import * as productsService from '../services/products.service.js';

export async function listProducts(req, res, next) {
  try {
    const products = await productsService.listProducts({
      category: req.query.category,
      material: req.query.material,
      sort: req.query.sort,
      includeUnavailable: req.query.includeUnavailable === 'true',
    });
    res.json({ data: products });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req, res, next) {
  try {
    const product = await productsService.getProductById(req.params.id);
    res.json({ data: product });
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req, res, next) {
  try {
    const product = await productsService.createProduct(req.body);
    res.status(201).json({ data: product });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const product = await productsService.updateProduct(req.params.id, req.body);
    res.json({ data: product });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    await productsService.deleteProduct(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
