import "server-only";
import mongoose from "mongoose";

const companySettingsSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: "YOUR COMPANY NAME", trim: true },
    address: { type: String, default: "YOUR STREET, CITY", trim: true },
    phone: { type: String, default: "+94 11 XXX XXXX", trim: true },
    email: { type: String, trim: true },
    website: { type: String, trim: true },
    taxRegistrationNumber: { type: String, trim: true },
    receiptFooterMessage: {
      type: String,
      default: "THANK YOU FOR YOUR BUSINESS!\nPLEASE VISIT AGAIN.",
      trim: true,
    },
  },
  { timestamps: true },
);

const CompanySettings =
  mongoose.models.CompanySettings || mongoose.model("CompanySettings", companySettingsSchema);

export default CompanySettings;
