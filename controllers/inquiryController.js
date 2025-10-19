import Inquiry from "../models/Inquiry.js";
import sendEmail from "../utils/emailSender.js";
import {
  adminNotificationTemplate,
  userAutoReplyTemplate,
} from "../utils/emailTemplates.js";

export const createInquiry = async (req, res) => {
  try {
    const { name, email, phone, message, property } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and message are required fields",
      });
    }

    const newInquiry = new Inquiry({ name, email, phone, message, property });
    await newInquiry.save();

    const adminEmail = process.env.ADMIN_EMAIL || "Bueccompany@gmail.com";

    // Email notifications
    await Promise.all([
      sendEmail(
        adminEmail,
        `📬 New Property Inquiry`,
        adminNotificationTemplate({ name, email, phone, message, property })
      ),
      sendEmail(
        email,
        "✅ Your Property Inquiry Received",
        userAutoReplyTemplate(name, true)
      ),
    ]);

    res.status(201).json({
      success: true,
      message: "Inquiry created successfully",
      data: newInquiry.toObject(), // Convert to plain JS object
    });
  } catch (err) {
    console.error("Create inquiry error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create inquiry",
      error: err.message,
    });
  }
};

export const getAllInquiries = async (req, res) => {
  try {
    const inquiries = await Inquiry.find()
      .sort({ createdAt: -1 })
      .populate("property", "title price") // Only include necessary fields
      .lean();

    res.status(200).json({
      success: true,
      count: inquiries.length,
      data: inquiries,
    });
  } catch (err) {
    console.error("Get inquiries error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch inquiries",
      error: err.message,
    });
  }
};

export const deleteInquiry = async (req, res) => {
  try {
    const deletedInquiry = await Inquiry.findByIdAndDelete(
      req.params.id
    ).lean();

    if (!deletedInquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Inquiry deleted successfully",
      data: deletedInquiry,
    });
  } catch (err) {
    console.error("Delete inquiry error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete inquiry",
      error: err.message,
    });
  }
};
