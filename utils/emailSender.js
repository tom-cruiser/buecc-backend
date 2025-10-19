import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create transporter lazily so importing this module won't attempt any
// network/auth steps. This avoids process crashes at startup when SMTP
// credentials are invalid or the SMTP server is unreachable.
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for others like 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Send an email. Errors are thrown so callers (controllers) can handle them.
 * This function avoids any transport verification at module load time.
 */
const sendEmail = async (to, subject, html) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"BUECC TEAM" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    // Do NOT call transporter.verify() automatically here; many providers
    // will reject auth and that could crash the app if unhandled. Instead,
    // let sendMail fail and bubble the error to the caller where it can be
    // handled gracefully.
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (err) {
    // Add contextual logging and rethrow so the controllers can return
    // appropriate HTTP errors instead of the process crashing.
    console.error("Email send failed:", err && err.message ? err.message : err);
    throw err;
  }
};

export default sendEmail;
