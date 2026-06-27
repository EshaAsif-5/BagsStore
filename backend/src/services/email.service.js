import nodemailer from "nodemailer";

// ─────────────────────────────────────────────
// EMAIL SERVICE
// Centralised Nodemailer transport + templates.
// All outgoing email in the application routes
// through this service.
// ─────────────────────────────────────────────

/**
 * Create and verify the Nodemailer transporter.
 * Uses Gmail SMTP at launch — replace with SendGrid / SES at scale.
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Gmail App Password (not account password)
    },
    // Connection pool for multiple emails
    pool: true,
    maxConnections: 5,
    rateLimit: 10, // Max 10 emails per second
  });
};

let transporter = null;

/**
 * Lazily initialise the transporter once on first use.
 * Prevents startup crashes when EMAIL_USER is not set in dev.
 */
const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

// ─────────────────────────────────────────────
// BRAND COLORS & SHARED STYLES
// ─────────────────────────────────────────────
const BRAND = {
  name: "ZEE.BY ZOHAIB",
  primaryColor: "#1a1a1a",
  accentColor: "#c9a96e",  // Gold — luxury bag brand aesthetic
  lightBg: "#f9f7f4",
  textColor: "#333333",
  whatsapp: process.env.VITE_WHATSAPP_NUMBER || "923XXXXXXXXX",
  supportEmail: process.env.EMAIL_USER || "support@zeebyzohaib.com",
  website: process.env.CLIENT_URL || "https://zeebyzohaib.com",
};

/**
 * Shared HTML email wrapper with header + footer.
 */
const emailWrapper = (bodyHtml) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${BRAND.name}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background:${BRAND.primaryColor};padding:28px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:3px;font-weight:400;text-transform:uppercase;">${BRAND.name}</h1>
              <p style="margin:6px 0 0;color:${BRAND.accentColor};font-size:11px;letter-spacing:2px;text-transform:uppercase;">Crafted for You</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:36px 40px;color:${BRAND.textColor};font-size:15px;line-height:1.7;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #eeeeee;margin:0;" />
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:24px 40px;text-align:center;background:${BRAND.lightBg};">
              <p style="margin:0 0 8px;font-size:13px;color:#888888;">Need help? Contact us:</p>
              <p style="margin:0 0 4px;font-size:13px;color:#555555;">
                📧 <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.accentColor};text-decoration:none;">${BRAND.supportEmail}</a>
              </p>
              <p style="margin:0 0 16px;font-size:13px;color:#555555;">
                💬 WhatsApp: <a href="https://wa.me/${BRAND.whatsapp}" style="color:${BRAND.accentColor};text-decoration:none;">+${BRAND.whatsapp}</a>
              </p>
              <p style="margin:0;font-size:11px;color:#aaaaaa;">
                © ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.<br/>Pakistan
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ─────────────────────────────────────────────
// EMAIL SENDERS
// ─────────────────────────────────────────────

/**
 * Send an email. All emails route through this.
 * Fails silently in development if EMAIL_USER is not set.
 *
 * @param {{ to, subject, html, text? }} options
 */
const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(`[EMAIL] Skipped: EMAIL_USER or EMAIL_PASS not configured. Subject: "${subject}"`);
    return { skipped: true };
  }

  try {
    const info = await getTransporter().sendMail({
      from: `"${BRAND.name}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || subject, // Plain text fallback
    });

    console.log(`[EMAIL] Sent to ${to} — ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    // Log but do not throw — email failure should never block a user action
    console.error(`[EMAIL] Failed to send to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Order confirmation email — sent to the customer after placing an order.
 */
const sendOrderConfirmation = async ({ to, name, orderNumber, items, pricing, paymentMethod, shippingAddress }) => {
  const paymentLabels = {
    cod: "Cash on Delivery",
    bank_transfer: "Bank Transfer",
    easypaisa: "EasyPaisa",
    jazzcash: "JazzCash",
    card: "Debit / Credit Card",
  };

  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;">
            ${item.name} — ${item.variant?.color || ""} / ${item.variant?.size || ""}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:right;">
            ${item.quantity} × PKR ${item.variant?.price?.toLocaleString("en-PK") || 0}
          </td>
        </tr>
      `
    )
    .join("");

  const html = emailWrapper(`
    <p style="font-size:18px;font-weight:bold;color:${BRAND.primaryColor};margin:0 0 8px;">
      Thank you for your order, ${name}! 🎉
    </p>
    <p style="margin:0 0 24px;color:#666666;">
      Your order has been received and is being processed.
    </p>

    <div style="background:${BRAND.lightBg};border-radius:6px;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0 0 4px;font-size:13px;color:#888888;letter-spacing:1px;text-transform:uppercase;">Order Number</p>
      <p style="margin:0;font-size:20px;font-weight:bold;color:${BRAND.accentColor};letter-spacing:2px;">${orderNumber}</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <thead>
        <tr>
          <th style="text-align:left;font-size:12px;color:#888888;letter-spacing:1px;text-transform:uppercase;padding-bottom:8px;border-bottom:2px solid #eeeeee;">Item</th>
          <th style="text-align:right;font-size:12px;color:#888888;letter-spacing:1px;text-transform:uppercase;padding-bottom:8px;border-bottom:2px solid #eeeeee;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        <tr>
          <td style="padding:10px 0 4px;font-size:14px;color:#888888;">Shipping</td>
          <td style="padding:10px 0 4px;font-size:14px;text-align:right;color:#888888;">
            ${pricing.shippingFee === 0 ? "FREE" : `PKR ${pricing.shippingFee.toLocaleString("en-PK")}`}
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:16px;font-weight:bold;color:${BRAND.primaryColor};">Total</td>
          <td style="padding:8px 0;font-size:16px;font-weight:bold;text-align:right;color:${BRAND.accentColor};">
            PKR ${pricing.total.toLocaleString("en-PK")}
          </td>
        </tr>
      </tbody>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;font-size:14px;">
      <tr>
        <td style="padding:4px 0;color:#888888;width:40%;">Payment Method</td>
        <td style="padding:4px 0;color:${BRAND.primaryColor};font-weight:bold;">${paymentLabels[paymentMethod] || paymentMethod}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#888888;">Delivering To</td>
        <td style="padding:4px 0;color:${BRAND.primaryColor};">${shippingAddress.city}, ${shippingAddress.province}</td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:14px;">
      Track your order anytime at:
      <a href="${BRAND.website}/track-order?orderNumber=${orderNumber}" style="color:${BRAND.accentColor};">${BRAND.website}/track-order</a>
    </p>
    <p style="margin:0;font-size:14px;color:#888888;">
      Use your order number <strong>${orderNumber}</strong> and the phone number provided at checkout.
    </p>
  `);

  return sendEmail({
    to,
    subject: `Order Confirmed — ${orderNumber} | ${BRAND.name}`,
    html,
  });
};

/**
 * Contact form acknowledgement — sent to the customer who submitted the form.
 */
const sendContactAcknowledgement = async ({ to, name, subject: submittedSubject }) => {
  const html = emailWrapper(`
    <p style="font-size:18px;font-weight:bold;color:${BRAND.primaryColor};margin:0 0 8px;">
      We've received your message, ${name}!
    </p>
    <p style="margin:0 0 20px;color:#666666;">
      Thank you for reaching out to ${BRAND.name}. Our team will get back to you within <strong>1–2 business days</strong>.
    </p>

    <div style="background:${BRAND.lightBg};border-radius:6px;padding:16px 20px;margin:0 0 24px;border-left:3px solid ${BRAND.accentColor};">
      <p style="margin:0 0 4px;font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:1px;">Your Subject</p>
      <p style="margin:0;font-size:15px;color:${BRAND.primaryColor};">${submittedSubject || "General Inquiry"}</p>
    </div>

    <p style="margin:0 0 8px;font-size:14px;color:#555555;">
      For urgent queries, reach us directly:
    </p>
    <p style="margin:0 0 4px;font-size:14px;">
      💬 <a href="https://wa.me/${BRAND.whatsapp}" style="color:${BRAND.accentColor};text-decoration:none;">WhatsApp us</a> for the fastest response.
    </p>
  `);

  return sendEmail({
    to,
    subject: `We received your message — ${BRAND.name}`,
    html,
  });
};

/**
 * Admin notification — sent to the store owner when a new contact form is submitted.
 */
const sendContactAdminNotification = async ({
  name,
  email,
  phone,
  subject: submittedSubject,
  message,
}) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
  if (!adminEmail) return;

  const html = emailWrapper(`
    <p style="font-size:18px;font-weight:bold;color:${BRAND.primaryColor};margin:0 0 8px;">
      📬 New Contact Form Submission
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;font-size:14px;border-collapse:collapse;">
      <tr>
        <td style="padding:8px 0;color:#888888;width:30%;vertical-align:top;">Name</td>
        <td style="padding:8px 0;color:${BRAND.primaryColor};font-weight:bold;">${name}</td>
      </tr>
      <tr style="background:${BRAND.lightBg};">
        <td style="padding:8px;color:#888888;vertical-align:top;">Email</td>
        <td style="padding:8px;color:${BRAND.primaryColor};">
          <a href="mailto:${email}" style="color:${BRAND.accentColor};">${email}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#888888;vertical-align:top;">Phone</td>
        <td style="padding:8px 0;color:${BRAND.primaryColor};">${phone || "Not provided"}</td>
      </tr>
      <tr style="background:${BRAND.lightBg};">
        <td style="padding:8px;color:#888888;vertical-align:top;">Subject</td>
        <td style="padding:8px;color:${BRAND.primaryColor};">${submittedSubject || "General Inquiry"}</td>
      </tr>
    </table>

    <div style="background:#fff8f0;border:1px solid ${BRAND.accentColor};border-radius:6px;padding:16px 20px;margin:0 0 20px;">
      <p style="margin:0 0 8px;font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:1px;">Message</p>
      <p style="margin:0;font-size:14px;color:${BRAND.primaryColor};line-height:1.8;white-space:pre-wrap;">${message}</p>
    </div>

    <p style="margin:0;font-size:13px;color:#888888;">
      Reply directly to this email or view it in the
      <a href="${BRAND.website}/admin/contacts" style="color:${BRAND.accentColor};">admin panel</a>.
    </p>
  `);

  return sendEmail({
    to: adminEmail,
    subject: `[Contact] ${submittedSubject || "New Message"} — from ${name}`,
    html,
  });
};

/**
 * Order status update notification — sent to customer when admin changes status.
 */
const sendOrderStatusUpdate = async ({
  to,
  name,
  orderNumber,
  newStatus,
  note,
  trackingNumber,
}) => {
  const statusMessages = {
    confirmed: {
      emoji: "✅",
      headline: "Your order has been confirmed!",
      body: "We're preparing your items for dispatch.",
    },
    processing: {
      emoji: "📦",
      headline: "Your order is being processed",
      body: "Our team is carefully packing your bag(s).",
    },
    shipped: {
      emoji: "🚚",
      headline: "Your order is on its way!",
      body: "Your order has been handed over to the courier.",
    },
    delivered: {
      emoji: "🎉",
      headline: "Order delivered!",
      body: "We hope you love your ZEE.BY ZOHAIB bag. Thank you for shopping with us!",
    },
    cancelled: {
      emoji: "❌",
      headline: "Order cancelled",
      body: "Your order has been cancelled. If stock was reserved, it has been restored.",
    },
  };

  const statusInfo = statusMessages[newStatus] || {
    emoji: "📋",
    headline: `Order status updated to "${newStatus}"`,
    body: "",
  };

  const html = emailWrapper(`
    <p style="font-size:22px;margin:0 0 4px;">${statusInfo.emoji}</p>
    <p style="font-size:18px;font-weight:bold;color:${BRAND.primaryColor};margin:0 0 8px;">
      ${statusInfo.headline}
    </p>
    <p style="margin:0 0 20px;color:#666666;">${statusInfo.body}</p>

    <div style="background:${BRAND.lightBg};border-radius:6px;padding:16px 20px;margin:0 0 20px;">
      <p style="margin:0 0 4px;font-size:13px;color:#888888;">Order Number</p>
      <p style="margin:0;font-size:18px;font-weight:bold;color:${BRAND.accentColor};">${orderNumber}</p>
    </div>

    ${
      trackingNumber
        ? `<div style="background:#f0faf4;border-radius:6px;padding:14px 20px;margin:0 0 20px;border-left:3px solid #2ecc71;">
            <p style="margin:0 0 4px;font-size:13px;color:#888888;">Tracking Number</p>
            <p style="margin:0;font-size:16px;font-weight:bold;color:#27ae60;">${trackingNumber}</p>
          </div>`
        : ""
    }

    ${
      note
        ? `<div style="margin:0 0 20px;padding:14px 20px;border-left:3px solid ${BRAND.accentColor};background:${BRAND.lightBg};border-radius:0 6px 6px 0;">
            <p style="margin:0 0 4px;font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:1px;">Note from our team</p>
            <p style="margin:0;font-size:14px;color:${BRAND.primaryColor};">${note}</p>
          </div>`
        : ""
    }

    <p style="margin:0;font-size:14px;">
      <a href="${BRAND.website}/track-order?orderNumber=${orderNumber}" style="display:inline-block;background:${BRAND.primaryColor};color:#ffffff;padding:12px 24px;border-radius:4px;text-decoration:none;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Track My Order</a>
    </p>
  `);

  return sendEmail({
    to,
    subject: `${statusInfo.emoji} Order ${orderNumber} — ${statusInfo.headline} | ${BRAND.name}`,
    html,
  });
};

export const emailService = {
  sendEmail,
  sendOrderConfirmation,
  sendContactAcknowledgement,
  sendContactAdminNotification,
  sendOrderStatusUpdate,
};