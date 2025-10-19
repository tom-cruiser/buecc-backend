// controllers/newsletterController.js
import { addToBrevoList } from "../services/brevoService.js";

/**
 * Handles newsletter subscription.
 * Expects: { email, name } in req.body
 */
export const subscribeUser = async (req, res) => {
  try {
    const { email, name } = req.body;

    // Simple validation
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "A valid email is required." });
    }

    await addToBrevoList(email, name);
    res.status(200).json({ message: "Subscribed successfully" });
  } catch (err) {
    console.error("❌ Error in subscribeUser:", err.message || err);
    res.status(500).json({ error: "Failed to subscribe. Try again later." });
  }
};
