import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { escapeHtml } from '../utils/escapeHtml.js';

export { escapeHtml };

const PRIMARY = '#2563EB';
const TEXT_DARK = '#1F2937';
const TEXT_MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const BG_LIGHT = '#F3F4F6';

function getTransporter() {
  if (!env.smtp.host || !env.orderToEmail) {
    return null;
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

export function formatCurrency(amount, currency) {
  const formatted = Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${currency || 'BDT'} ${formatted}`;
}

export function formatDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Dhaka',
  });
}

function summaryRow(label, valueHtml) {
  return `
    <tr>
      <td style="padding:6px 0;font-size:13px;color:${TEXT_MUTED};width:45%;">${label}</td>
      <td style="padding:6px 0;font-size:13px;color:${TEXT_DARK};font-weight:600;text-align:right;">${valueHtml}</td>
    </tr>`;
}

function buildItemsRows(order) {
  return order.items
    .map((item) => {
      const lineTotal = item.unitPrice * item.quantity;
      const tags = (item.tags || []).map(escapeHtml).join(', ');
      return `
        <tr>
          <td style="padding:10px 12px;font-size:13px;color:${TEXT_DARK};border-bottom:1px solid ${BORDER};">
            ${escapeHtml(item.name)}
            ${tags ? `<br><span style="font-size:11px;color:${TEXT_MUTED};">${tags}</span>` : ''}
          </td>
          <td style="padding:10px 12px;font-size:13px;color:${TEXT_DARK};border-bottom:1px solid ${BORDER};text-align:center;">${item.quantity}</td>
          <td style="padding:10px 12px;font-size:13px;color:${TEXT_DARK};border-bottom:1px solid ${BORDER};text-align:right;white-space:nowrap;">${formatCurrency(item.unitPrice, order.currency)}</td>
          <td style="padding:10px 12px;font-size:13px;color:${TEXT_DARK};font-weight:600;border-bottom:1px solid ${BORDER};text-align:right;white-space:nowrap;">${formatCurrency(lineTotal, order.currency)}</td>
        </tr>`;
    })
    .join('');
}

function buildOrderEmailHtml(order) {
  const statusBadge = `
    <span style="display:inline-block;padding:3px 10px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#FFFFFF;background-color:${PRIMARY};border-radius:12px;">
      ${escapeHtml(order.status)}
    </span>`;

  const notesBlock = order.notes && order.notes.trim()
    ? `
    <tr>
      <td style="padding:0 32px 24px 32px;">
        <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${TEXT_MUTED};">Notes</p>
        <div style="padding:12px 16px;background-color:${BG_LIGHT};border-radius:6px;font-size:13px;color:${TEXT_DARK};line-height:1.5;">
          ${escapeHtml(order.notes).replace(/\n/g, '<br>')}
        </div>
      </td>
    </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Order ${escapeHtml(order.orderNumber)}</title>
</head>
<body style="margin:0;padding:0;background-color:${BG_LIGHT};font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_LIGHT};padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:640px;max-width:94%;background-color:#FFFFFF;border-radius:8px;border:1px solid ${BORDER};overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:28px 32px;border-top:4px solid ${PRIMARY};border-bottom:1px solid ${BORDER};">
              <h1 style="margin:0;font-size:20px;color:${TEXT_DARK};">New Order Received</h1>
              <p style="margin:6px 0 0 0;font-size:13px;color:${TEXT_MUTED};">Toolify 3D Admin Notification</p>
            </td>
          </tr>

          <!-- Order summary -->
          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 12px 0;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${TEXT_MUTED};">Order Summary</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_LIGHT};border-radius:6px;">
                <tr><td style="padding:16px 20px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    ${summaryRow('Order Number', escapeHtml(order.orderNumber))}
                    ${summaryRow('Placed On', escapeHtml(formatDateTime(order.createdAt)))}
                    ${summaryRow('Status', statusBadge)}
                    ${summaryRow('Payment Method', escapeHtml(String(order.paymentMethod || '').toUpperCase()))}
                    ${summaryRow('Payment Status', escapeHtml(String(order.paymentStatus || '').replace(/_/g, ' ')))}
                  </table>
                </td></tr>
              </table>
            </td>
          </tr>

          <!-- Customer / shipping -->
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <p style="margin:0 0 12px 0;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${TEXT_MUTED};">Customer &amp; Shipping</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:6px;">
                <tr><td style="padding:16px 20px;">
                  <p style="margin:0 0 4px 0;font-size:14px;font-weight:700;color:${TEXT_DARK};">${escapeHtml(order.shippingAddress?.name)}</p>
                  <p style="margin:0 0 4px 0;font-size:13px;color:${TEXT_DARK};">${escapeHtml(order.shippingAddress?.phone)}</p>
                  <p style="margin:0;font-size:13px;color:${TEXT_MUTED};line-height:1.5;">${escapeHtml(order.shippingAddress?.address)}</p>
                </td></tr>
              </table>
            </td>
          </tr>

          <!-- Items -->
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <p style="margin:0 0 12px 0;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${TEXT_MUTED};">Items (${order.items.length})</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:6px;border-collapse:separate;">
                <tr>
                  <th align="left" style="padding:10px 12px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${TEXT_MUTED};background-color:${BG_LIGHT};border-bottom:1px solid ${BORDER};">Product</th>
                  <th align="center" style="padding:10px 12px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${TEXT_MUTED};background-color:${BG_LIGHT};border-bottom:1px solid ${BORDER};">Qty</th>
                  <th align="right" style="padding:10px 12px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${TEXT_MUTED};background-color:${BG_LIGHT};border-bottom:1px solid ${BORDER};">Unit&nbsp;Price</th>
                  <th align="right" style="padding:10px 12px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${TEXT_MUTED};background-color:${BG_LIGHT};border-bottom:1px solid ${BORDER};">Total</th>
                </tr>
                ${buildItemsRows(order)}
                <tr>
                  <td colspan="3" style="padding:10px 12px;font-size:13px;color:${TEXT_MUTED};text-align:right;">Subtotal</td>
                  <td style="padding:10px 12px;font-size:13px;color:${TEXT_DARK};text-align:right;white-space:nowrap;">${formatCurrency(order.subtotal, order.currency)}</td>
                </tr>
                <tr>
                  <td colspan="3" style="padding:12px;font-size:14px;font-weight:700;color:${TEXT_DARK};text-align:right;border-top:1px solid ${BORDER};">Grand Total</td>
                  <td style="padding:12px;font-size:16px;font-weight:700;color:${PRIMARY};text-align:right;border-top:1px solid ${BORDER};white-space:nowrap;">${formatCurrency(order.subtotal, order.currency)}</td>
                </tr>
              </table>
            </td>
          </tr>

          ${notesBlock}

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:${BG_LIGHT};border-top:1px solid ${BORDER};">
              <p style="margin:0;font-size:12px;color:${TEXT_MUTED};text-align:center;">This is an automated admin notification from Toolify 3D.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildOrderEmailText(order) {
  const lines = [
    'NEW ORDER RECEIVED — Toolify 3D',
    '',
    `Order Number: ${order.orderNumber}`,
    `Placed On: ${formatDateTime(order.createdAt)}`,
    `Status: ${order.status}`,
    `Payment Method: ${String(order.paymentMethod || '').toUpperCase()}`,
    `Payment Status: ${String(order.paymentStatus || '').replace(/_/g, ' ')}`,
    '',
    'Customer & Shipping:',
    `  Name: ${order.shippingAddress?.name}`,
    `  Phone: ${order.shippingAddress?.phone}`,
    `  Address: ${order.shippingAddress?.address}`,
    '',
    `Items (${order.items.length}):`,
    ...order.items.map((item) => {
      const tags = (item.tags || []).join(', ');
      return `  - ${item.name}${tags ? ` [${tags}]` : ''} x${item.quantity} @ ${formatCurrency(item.unitPrice, order.currency)} = ${formatCurrency(item.unitPrice * item.quantity, order.currency)}`;
    }),
    '',
    `Subtotal: ${formatCurrency(order.subtotal, order.currency)}`,
    `Grand Total: ${formatCurrency(order.subtotal, order.currency)}`,
  ];

  if (order.notes && order.notes.trim()) {
    lines.push('', 'Notes:', order.notes);
  }

  lines.push('', 'This is an automated admin notification from Toolify 3D.');
  return lines.join('\n');
}

// Sends the admin notification. Never throws — order creation must succeed
// even if the email service is down or unconfigured.
export async function sendOrderNotificationEmail(order) {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.warn(
        `[orderEmail] Skipped notification for ${order.orderNumber}: SMTP_HOST or ORDER_TO_EMAIL not configured`
      );
      return { sent: false };
    }

    await transporter.sendMail({
      from: env.orderFromEmail,
      to: env.orderToEmail,
      subject: `New Order ${order.orderNumber} | ${formatCurrency(order.subtotal, order.currency)} | ${order.status}`,
      html: buildOrderEmailHtml(order),
      text: buildOrderEmailText(order),
    });

    return { sent: true };
  } catch (err) {
    console.error(
      `[orderEmail] Failed to send notification for ${order.orderNumber}:`,
      err.message
    );
    return { sent: false };
  }
}
