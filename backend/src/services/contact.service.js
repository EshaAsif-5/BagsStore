import { contactRepository } from "../repositories/contact.repository.js";
import { emailService } from "./email.service.js";
import ApiError from "../utils/ApiError.js";

// ─────────────────────────────────────────────
// CONTACT SERVICE
// Business logic for contact form submissions.
// Stores to DB and triggers dual email notifications:
//   1. Acknowledgement → customer
//   2. Admin alert     → store owner
// ─────────────────────────────────────────────

/**
 * Submit a contact form message.
 * Persists to DB then fires both emails concurrently.
 * Email failures are non-fatal — the submission is still saved.
 *
 * @param {Object} data        - Form field values
 * @param {string|null} userId - Authenticated user ID (null for guests)
 * @param {string|null} ip     - Client IP for abuse tracking (select: false on model)
 */
const submitContact = async (
  { name, email, phone, subject, message },
  userId = null,
  ip = null
) => {
  // Persist the submission first — email can fail without losing the message
  const contact = await contactRepository.createContact({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone?.trim() || null,
    subject: subject?.trim() || "General Inquiry",
    message: message.trim(),
    user: userId || null,
    ipAddress: ip || null,
    isRead: false,
  });

  // Fire both emails concurrently — neither blocks the other
  // Both are wrapped in the emailService's internal try/catch so
  // a failure in one does not surface to the user
  await Promise.allSettled([
    emailService.sendContactAcknowledgement({
      to: email,
      name,
      subject: contact.subject,
    }),
    emailService.sendContactAdminNotification({
      name,
      email,
      phone: phone || null,
      subject: contact.subject,
      message,
    }),
  ]);

  return {
    _id: contact._id,
    name: contact.name,
    email: contact.email,
    subject: contact.subject,
    createdAt: contact.createdAt,
  };
};

/**
 * Admin: get all contact submissions with pagination and read/unread filter.
 */
const getAllContacts = async (queryParams) => {
  return contactRepository.findAllAdmin(queryParams);
};

/**
 * Admin: get a single contact message by ID.
 * Auto-marks as read when an admin opens it.
 */
const getContactById = async (contactId, adminId) => {
  const contact = await contactRepository.findById(contactId);
  if (!contact) {
    throw new ApiError(404, "Contact message not found.");
  }

  // Auto-read on open — mirrors email client behaviour
  if (!contact.isRead) {
    await contactRepository.markAsRead(contactId, adminId);
    contact.isRead = true;
    contact.readAt = new Date();
    contact.readBy = adminId;
  }

  return contact;
};

/**
 * Admin: explicitly mark a message as read.
 */
const markAsRead = async (contactId, adminId) => {
  const contact = await contactRepository.findByIdRaw(contactId);
  if (!contact) {
    throw new ApiError(404, "Contact message not found.");
  }

  if (contact.isRead) {
    return contact; // Already read — no-op
  }

  return contactRepository.markAsRead(contactId, adminId);
};

/**
 * Admin: mark a message as unread — for workflow management.
 * Useful when an admin wants to revisit a message later.
 */
const markAsUnread = async (contactId) => {
  const contact = await contactRepository.findByIdRaw(contactId);
  if (!contact) {
    throw new ApiError(404, "Contact message not found.");
  }

  if (!contact.isRead) {
    return contact; // Already unread — no-op
  }

  return contactRepository.markAsUnread(contactId);
};

/**
 * Admin: delete a contact message.
 */
const deleteContact = async (contactId) => {
  const contact = await contactRepository.findByIdRaw(contactId);
  if (!contact) {
    throw new ApiError(404, "Contact message not found.");
  }

  await contactRepository.deleteContact(contactId);
};

/**
 * Get unread message count for admin sidebar badge.
 */
const getUnreadCount = async () => {
  const count = await contactRepository.countUnread();
  return { unreadCount: count };
};

export const contactService = {
  submitContact,
  getAllContacts,
  getContactById,
  markAsRead,
  markAsUnread,
  deleteContact,
  getUnreadCount,
};