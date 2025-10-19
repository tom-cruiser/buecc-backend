import express from "express";
import {
  loginAdmin,
  registerAdmin,
  verifyTokenRoute,
} from "../controllers/authController.js";
import propertyRoutes from "./propertyRoutes.js";
import sendEmail from "../utils/emailSender.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/login", loginAdmin);
router.post("/register", registerAdmin);
router.get("/verify", protect, verifyTokenRoute); // ✅ New route
router.use("/properties", propertyRoutes);

// 🧪 Test email route
router.post("/send-test-email", async (req, res) => {
  try {
    await sendEmail(
      "your-other-email@example.com", // or your real inbox
      "🚀 Test Email from Real Estate App",
      "<h2>Hello Admin!</h2><p>This is a test email sent from your Node.js backend.</p>"
    );

    res.status(200).json({ message: "Email sent successfully!" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to send email", error: err.message });
  }
});

export default router;
