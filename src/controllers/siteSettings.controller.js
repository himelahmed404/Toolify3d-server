import * as siteSettingsService from '../services/siteSettings.service.js';

export async function getPublicSettings(_req, res, next) {
  try {
    const data = await siteSettingsService.getPublicSiteSettings();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getAdminSettings(_req, res, next) {
  try {
    const data = await siteSettingsService.getAdminSiteSettings();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminSettings(req, res, next) {
  try {
    const data = await siteSettingsService.updateSiteSettings(req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
