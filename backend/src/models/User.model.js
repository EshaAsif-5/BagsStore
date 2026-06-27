import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// ─────────────────────────────────────────────
// ADDRESS SUB-SCHEMA
// ─────────────────────────────────────────────
const addressSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      maxlength: [30, "Address label cannot exceed 30 characters"],
      default: "Home",
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [80, "Full name cannot exceed 80 characters"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^(\+92|0)[0-9]{10}$/, "Please provide a valid Pakistani phone number"],
    },
    street: {
      type: String,
      required: [true, "Street address is required"],
      trim: true,
      maxlength: [200, "Street address cannot exceed 200 characters"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      maxlength: [60, "City name cannot exceed 60 characters"],
    },
    province: {
      type: String,
      required: [true, "Province is required"],
      enum: {
        values: [
          "Punjab",
          "Sindh",
          "Khyber Pakhtunkhwa",
          "Balochistan",
          "Gilgit-Baltistan",
          "Azad Kashmir",
          "Islamabad Capital Territory",
        ],
        message: "{VALUE} is not a valid Pakistani province or territory",
      },
    },
    postalCode: {
      type: String,
      trim: true,
      match: [/^[0-9]{5}$/, "Postal code must be 5 digits"],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

// ─────────────────────────────────────────────
// USER SCHEMA
// ─────────────────────────────────────────────
const userSchema = new mongoose.Schema(
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
      unique: true,
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
      match: [/^(\+92|0)[0-9]{10}$/, "Please provide a valid Pakistani phone number"],
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Never return password in queries by default
    },
    role: {
      type: String,
      enum: {
        values: ["customer", "admin"],
        message: "{VALUE} is not a valid role",
      },
      default: "customer",
    },
    addresses: {
      type: [addressSchema],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 5,
        message: "You can save a maximum of 5 addresses",
      },
    },
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    refreshToken: {
      type: String,
      select: false,
    },
    passwordChangedAt: {
      type: Date,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// ─────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

// ─────────────────────────────────────────────
// PRE-SAVE: HASH PASSWORD
// ─────────────────────────────────────────────
userSchema.pre("save", async function () {
  // Only hash if password was modified
  if (!this.isModified("passwordHash")) return;

  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);

  // Update passwordChangedAt if not a new user
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000; // 1s buffer for JWT iat lag
  }
});

// ─────────────────────────────────────────────
// PRE-SAVE: ENFORCE SINGLE DEFAULT ADDRESS
// ─────────────────────────────────────────────
userSchema.pre("save", function () {
  if (!this.isModified("addresses")) return;

  const defaultAddresses = this.addresses.filter((a) => a.isDefault);

  // If more than one default, keep only the last one as default
  if (defaultAddresses.length > 1) {
    this.addresses.forEach((a) => (a.isDefault = false));
    this.addresses[this.addresses.length - 1].isDefault = true;
  }

  // If none is default and addresses exist, set the first as default
  if (defaultAddresses.length === 0 && this.addresses.length > 0) {
    this.addresses[0].isDefault = true;
  }
});

// ─────────────────────────────────────────────
// INSTANCE METHODS
// ─────────────────────────────────────────────
userSchema.methods.isPasswordCorrect = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.isPasswordChangedAfter = function (jwtIssuedAt) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return jwtIssuedAt < changedTimestamp;
  }
  return false;
};

// ─────────────────────────────────────────────
// TRANSFORM: REMOVE SENSITIVE FIELDS FROM JSON
// ─────────────────────────────────────────────
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.refreshToken;
    delete ret.passwordChangedAt;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model("User", userSchema);

export default User;