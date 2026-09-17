import "server-only";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    phone: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // never return password in queries by default
    },
    role: {
      type: String,
      enum: [
        "admin",
        "manager",
        "accountant",
        "sales_manager",
        "sales_rep",
        "warehouse_staff",
        "production_staff",
        "staff",
        "customer",
        "inventory_admin",
      ],
      default: "staff",
    },
    nic: { type: String, trim: true },
    address: { type: String, trim: true },
    emergencyContact: {
      name: { type: String, trim: true },
      relationship: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    permissions: [
      {
        type: String,
        enum: ["adjust_stock", "manage_prices", "approve_po", "manage_users"],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  },
);

// Virtual: full name
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Make virtuals show up in JSON
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

// Hash password before saving (only if modified)
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method: compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Instance method: check if account is locked
userSchema.methods.isLocked = function () {
  return this.lockedUntil && this.lockedUntil > Date.now();
};

// Exclude soft-deleted by default
userSchema.pre(/^find/, function () {
  if (!this.getOptions || !this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
