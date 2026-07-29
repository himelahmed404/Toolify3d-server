import * as materialsService from '../services/materials.service.js';

export async function listPublicMaterials(_req, res, next) {
  try {
    const data = await materialsService.listPublicMaterials();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function listAdminMaterials(_req, res, next) {
  try {
    const data = await materialsService.listAdminMaterials();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function updateMaterial(req, res, next) {
  try {
    const data = await materialsService.updateMaterial(req.params.slug, req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
