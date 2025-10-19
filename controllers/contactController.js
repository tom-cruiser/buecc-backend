// controllers/contactController.js

import sendEmail from "../utils/emailSender.js";
import {
  adminNotificationTemplate,
  userAutoReplyTemplate,
} from "../utils/emailTemplates.js";

export const submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, subject, message, serviceType } = req.body;

    const adminEmail = process.env.ADMIN_EMAIL || "info@buecc.bi";

    // Send email to admin
    await sendEmail(
      adminEmail,
      `📬 New Contact: ${subject}`,
      adminNotificationTemplate({
        name,
        email,
        phone,
        subject,
        message,
        serviceType,
      })
    );

    // Send auto-reply to user
    await sendEmail(
      email,
      "✅ We Received Your Message",
      userAutoReplyTemplate(name, false)
    );

    res.status(200).json({ message: "Message sent successfully" });
  } catch (err) {
    console.error("Contact form error:", err.message);
    res
      .status(500)
      .json({ message: "Something went wrong", error: err.message });
  }
};
