// Ported from settingsController.js. Context/response adapters preserve status and operation ordering.
import "server-only";
import CompanySettings from "../models/CompanySettings.js";

export const getCompanySettings = async (req, res) => {
  let settings = await CompanySettings.findOne();

  if (!settings) {
    settings = await CompanySettings.create({});
  }

  res.status(200).json({ success: true, data: settings });
};

export const updateCompanySettings = async (req, res) => {
  let settings = await CompanySettings.findOne();

  if (!settings) {
    settings = new CompanySettings();
  }

  const {
    companyName,
    address,
    phone,
    email,
    website,
    taxRegistrationNumber,
    receiptFooterMessage,
  } = req.body;

  if (companyName !== undefined) settings.companyName = companyName;
  if (address !== undefined) settings.address = address;
  if (phone !== undefined) settings.phone = phone;
  if (email !== undefined) settings.email = email;
  if (website !== undefined) settings.website = website;
  if (taxRegistrationNumber !== undefined) settings.taxRegistrationNumber = taxRegistrationNumber;
  if (receiptFooterMessage !== undefined) settings.receiptFooterMessage = receiptFooterMessage;

  const updatedSettings = await settings.save();
  res.status(200).json({ success: true, data: updatedSettings });
};
