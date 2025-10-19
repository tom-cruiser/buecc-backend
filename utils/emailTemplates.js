// utils/emailTemplates.js

export const adminNotificationTemplate = (data) => {
  const isPropertyInquiry = !!data.property;

  return `
    <h2>📩 New ${isPropertyInquiry ? "Property" : "Contact"} Submission</h2>
    <p><strong>Name:</strong> ${data.name}</p>
    <p><strong>Email:</strong> ${data.email}</p>
    <p><strong>Phone:</strong> ${data.phone || "Not provided"}</p>
    <p><strong>Subject:</strong> ${data.subject || "Not specified"}</p>
    <p><strong>Message:</strong><br/>${data.message}</p>
    ${
      isPropertyInquiry
        ? `<p><strong>Property ID:</strong> ${data.property}</p>`
        : `<p><strong>Service Type:</strong> ${
            data.serviceType || "General"
          }</p>`
    }
    <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
  `;
};

export const userAutoReplyTemplate = (name, isProperty = false) => `
  <h2>Hello ${name},</h2>
  <p>Thank you for reaching out${
    isProperty ? " about the property" : ""
  }. We've received your message and will get back to you shortly.</p>
  <p>If you have more questions, feel free to reply to this email.</p>
  <br/>
  <p>Best regards,<br/>BUECC Team</p>
`;
