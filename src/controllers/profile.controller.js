import * as profileService from '../services/profile.service.js';

export async function getProfile(req, res, next) {
  try {
    const defaults = await profileService.getUserDefaults(req.user.id);
    const profile = await profileService.getOrCreateProfile(req.user.id, defaults);
    res.json({ data: profile });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const profile = await profileService.updateProfile(req.user.id, req.body);
    res.json({ data: profile });
  } catch (err) {
    next(err);
  }
}
