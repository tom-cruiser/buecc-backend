import express from "express";
import {
  createTeamMember,
  getAllTeamMembers,
  getTeamMemberById,
  updateTeamMember,
  deleteTeamMember,
} from "../controllers/teamMemberController.js";
import { protect } from "../middleware/auth.js";
import { uploadSingle, handleUploadErrors } from "../middleware/upload.js";

const router = express.Router();

// Public routes for fetching team members
router.get("/", getAllTeamMembers);
router.get("/:id", getTeamMemberById);

// All routes below this point require authentication
router.use(protect);

// Create a new team member with a single image upload
router.post("/", uploadSingle, handleUploadErrors, createTeamMember);

// Update a team member, optionally updating their image
router.put("/:id", uploadSingle, handleUploadErrors, updateTeamMember);

// Delete a team member and their associated image
router.delete("/:id", deleteTeamMember);

export default router;
