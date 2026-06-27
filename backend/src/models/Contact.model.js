import mongoose from "mongoose";

// ─────────────────────────────────────────────
// CONTACT SCHEMA
// ─────────────────────────────────────────────
const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [80, "Name cannot exceed 80 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please provide a valid email address",
      ],
    },
    phone: {
      type: String,
      trim: true,
      match: [
        /^(\+92|0)[0-9]{10}$/,
        "Please provide a valid Pakistani phone number",
      ],
      default: null,
    },
    subject: {
      type: String,
      trim: true,
      maxlength: [150, "Subject cannot exceed 150 characters"],
      default: "General Inquiry",
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      minlength: [10, "Message must be at least 10 characters"],
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    readBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Link to user account if they were logged in when submitting
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    ipAddress: {
      type: String,
      trim: true,
      default: null,
      select: false, // Hidden from public queries — admin only
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────
contactSchema.index({ isRead: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ email: 1 });

// ─────────────────────────────────────────────
// PRE-SAVE: SET readAt WHEN MARKED AS READ
// ─────────────────────────────────────────────
contactSchema.pre("save", function () {
  if (this.isModified("isRead") && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
});

// ─────────────────────────────────────────────
// TRANSFORM
// ─────────────────────────────────────────────
contactSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Contact = mongoose.model("Contact", contactSchema);

export default Contact;