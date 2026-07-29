import * as contactService from '../services/contact.service.js';

export async function submitContact(req, res, next) {
  try {
    const result = await contactService.sendContactEmail(req.body);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
