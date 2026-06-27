import Contact from "../models/Contact.model.js";

// ─────────────────────────────────────────────
// CONTACT REPOSITORY
// Pure database access layer — no business logic.
// ─────────────────────────────────────────────

/**
 * Create and persist a new contact submission.
 */
const createContact = async (contactData) => {
  const contact = new Contact(contactData);
  await contact.save();
  return contact;
};

/**
 * Find a contact message by its MongoDB ObjectId.
 */
const findById = (contactId) => {
  return Contact.findById(contactId)
    .populate("user", "name email")
    .populate("readBy", "name");
};

/**
 * Find a contact by ID without population — for internal mutations.
 */
const findByIdRaw = (contactId) => {
  return Contact.findById(contactId);
};

/**
 * Admin: get all contact submissions with optional read/unread filter.
 * Sorted newest first.
 */
const findAllAdmin = async ({
  page = 1,
  limit = 20,
  isRead,
} = {}) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (isRead !== undefined && isRead !== null) {
    filter.isRead = isRead === "true" || isRead === true;
  }

  const [contacts, total] = await Promise.all([
    Contact.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("user", "name email")
      .select("-ipAddress"), // Hide IP from listing — available on single fetch
    Contact.countDocuments(filter),
  ]);

  return {
    contacts,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
    hasNextPage: pageNum < Math.ceil(total / limitNum),
    hasPrevPage: pageNum > 1,
    unreadCount: await Contact.countDocuments({ isRead: false }),
  };
};

/**
 * Mark a contact message as read.
 * Records who read it and when.
 */
const markAsRead = (contactId, adminId) => {
  return Contact.findByIdAndUpdate(
    contactId,
    {
      isRead: true,
      readAt: new Date(),
      readBy: adminId,
    },
    { new: true }
  );
};

/**
 * Mark a contact message as unread — for admin workflow management.
 */
const markAsUnread = (contactId) => {
  return Contact.findByIdAndUpdate(
    contactId,
    {
      isRead: false,
      readAt: null,
      readBy: null,
    },
    { new: true }
  );
};

/**
 * Delete a contact message (admin only).
 */
const deleteContact = (contactId) => {
  return Contact.findByIdAndDelete(contactId);
};

/**
 * Get unread count — for admin sidebar badge.
 */
const countUnread = () => {
  return Contact.countDocuments({ isRead: false });
};

/**
 * Save a mutated contact document.
 */
const saveContact = (contact) => {
  return contact.save();
};

export const contactRepository = {
  createContact,
  findById,
  findByIdRaw,
  findAllAdmin,
  markAsRead,
  markAsUnread,
  deleteContact,
  countUnread,
  saveContact,
};