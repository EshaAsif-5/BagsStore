import { contactService } from "../services/contact.service.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

// ─────────────────────────────────────────────
// CONTACT CONTROLLERS
// ─────────────────────────────────────────────

// ── PUBLIC ───────────────────────────────────

/**
 * POST /api/v1/contact
 * Submit a contact form message.
 * Works for both authenticated users and guests.
 * Triggers customer acknowledgement + admin notification emails.
 *
 * Body: { name, email, phone?, subject?, message }
 */
const submitContact = asyncHandler(async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  // Extract client IP for abuse tracking (hidden from API responses)
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    null;

  // Attach user ID if authenticated (links submission to their account)
  const userId = req.user?._id || null;

  const submission = await contactService.submitContact(
    { name, email, phone, subject, message },
    userId,
    ip
  );

  return res.status(201).json(
    new ApiResponse(
      201,
      { submission },
      "Your message has been received! We'll get back to you within 1–2 business days."
    )
  );
});

// ── ADMIN ────────────────────────────────────

/**
 * GET /api/v1/contact/admin/all
 * Admin: get all contact messages with pagination and read/unread filter.
 *
 * Query params: page, limit, isRead
 */
const getAllContacts = asyncHandler(async (req, res) => {
  const result = await contactService.getAllContacts(req.query);

  return res.status(200).json(
    new ApiResponse(200, result, "Contact messages fetched successfully.")
  );
});

/**
 * GET /api/v1/contact/admin/unread-count
 * Admin: get count of unread messages for sidebar badge.
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const result = await contactService.getUnreadCount();

  return res.status(200).json(
    new ApiResponse(200, result, "Unread contact count fetched.")
  );
});

/**
 * GET /api/v1/contact/admin/:contactId
 * Admin: get a single contact message by ID.
 * Auto-marks the message as read when opened.
 */
const getContactById = asyncHandler(async (req, res) => {
  const contact = await contactService.getContactById(
    req.params.contactId,
    req.user._id
  );

  return res.status(200).json(
    new ApiResponse(200, { contact }, "Contact message fetched.")
  );
});

/**
 * PUT /api/v1/contact/admin/:contactId/read
 * Admin: explicitly mark a message as read.
 */
const markAsRead = asyncHandler(async (req, res) => {
  const contact = await contactService.markAsRead(
    req.params.contactId,
    req.user._id
  );

  return res.status(200).json(
    new ApiResponse(200, { contact }, "Message marked as read.")
  );
});

/**
 * PUT /api/v1/contact/admin/:contactId/unread
 * Admin: mark a message as unread — for workflow/follow-up management.
 */
const markAsUnread = asyncHandler(async (req, res) => {
  const contact = await contactService.markAsUnread(req.params.contactId);

  return res.status(200).json(
    new ApiResponse(200, { contact }, "Message marked as unread.")
  );
});

/**
 * DELETE /api/v1/contact/admin/:contactId
 * Admin: permanently delete a contact message.
 */
const deleteContact = asyncHandler(async (req, res) => {
  await contactService.deleteContact(req.params.contactId);

  return res.status(200).json(
    new ApiResponse(200, null, "Contact message deleted.")
  );
});

export const contactController = {
  submitContact,
  getAllContacts,
  getUnreadCount,
  getContactById,
  markAsRead,
  markAsUnread,
  deleteContact,
};