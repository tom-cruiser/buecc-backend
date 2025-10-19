import express from "express";
import {
  createInquiry,
  getAllInquiries,
  deleteInquiry,
} from "../controllers/inquiryController.js";

import { protect } from "../middleware/auth.js";

const router = express.Router();

// Public route
router.post("/", createInquiry);

// Admin-only routes
router.get("/", protect, getAllInquiries);
router.delete("/:id", protect, deleteInquiry);

export default router;
