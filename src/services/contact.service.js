import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { escapeHtml } from '../utils/escapeHtml.js';

function getTransporter() {
  if (!env.smtp.host || !env.contactToEmail) {
    throw new AppError('Email service is not configured', 503, 'SERVICE_UNAVAILABLE');
  }

  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user
      ? { user: env.smtp.user, pass: env.smtp.pass }
      : undefined,
  });
}

export async function sendContactEmail({ name, email, quantity, material, description }) {
  const transporter = getTransporter();

  const html = `
    <h2>New Toolify 3D Contact Request</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Quantity:</strong> ${escapeHtml(quantity)}</p>
    <p><strong>Material:</strong> ${escapeHtml(material)}</p>
    <p><strong>Description:</strong></p>
    <p>${escapeHtml(description).replace(/\n/g, '<br>')}</p>
  `;

  await transporter.sendMail({
    from: env.contactFromEmail,
    to: env.contactToEmail,
    replyTo: email,
    subject: `Toolify 3D — Contact request from ${name}`,
    html,
    text: `Name: ${name}\nEmail: ${email}\nQuantity: ${quantity}\nMaterial: ${material}\n\n${description}`,
  });

  return { success: true };
}
