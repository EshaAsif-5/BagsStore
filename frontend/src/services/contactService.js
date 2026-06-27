import api from "./api.js";

// ─────────────────────────────────────────────
// CONTACT SERVICE
// Public: submit contact form.
// Admin: read, moderate, and manage messages.
// ─────────────────────────────────────────────

/**
 * Submit a contact form message.
 * Works for both guests and authenticated users.
 * Triggers customer acknowledgement + admin notification emails.
 *
 * @param {{ name, email, phone?, subject?, message }} payload
 */
const submitContact = async ({ name, email, phone, subject, message }) => {
  const { data } = await api.post("/contact", {
    name,
    email,
    phone: phone || undefined,
    subject: subject || undefined,
    message,
  });
  return data.data.submission;
};

// ── Admin ─────────────────────────────────────

/**
 * Admin: get all contact messages with pagination.
 * @param {{ page?, limit?, isRead? }} params
 */
const getAllContacts = async (params = {}) => {
  const { data } = await api.get("/contact/admin/all", { params });
  return data.data;
};

/**
 * Admin: get unread message count for sidebar badge.
 */
const getUnreadCount = async () => {
  const { data } = await api.get("/contact/admin/unread-count");
  return data.data.unreadCount;
};

/**
 * Admin: get a single contact message by ID.
 * Auto-marks as read when opened.
 * @param {string} contactId
 */
const getContactById = async (contactId) => {
  const { data } = await api.get(`/contact/admin/${contactId}`);
  return data.data.contact;
};

/**
 * Admin: explicitly mark a message as read.
 * @param {string} contactId
 */
const markAsRead = async (contactId) => {
  const { data } = await api.put(`/contact/admin/${contactId}/read`);
  return data.data.contact;
};

/**
 * Admin: mark a message as unread for follow-up.
 * @param {string} contactId
 */
const markAsUnread = async (contactId) => {
  const { data } = await api.put(`/contact/admin/${contactId}/unread`);
  return data.data.contact;
};

/**
 * Admin: permanently delete a contact message.
 * @param {string} contactId
 */
const deleteContact = async (contactId) => {
  const { data } = await api.delete(`/contact/admin/${contactId}`);
  return data;
};

const contactService = {
  submitContact,
  getAllContacts,
  getUnreadCount,
  getContactById,
  markAsRead,
  markAsUnread,
  deleteContact,
};

export default contactService;