import express from "express";
import {
  uploadSingle,
  uploadMultiple,
  handleUploadErrors,
} from "../middleware/upload.js";
import {
  createProperty,
  getAllProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  addPropertyImages,
  deletePropertyImage,
} from "../controllers/propertyController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/", getAllProperties);
router.get("/:id", getPropertyById);

// Protected routes
router.use(protect);

// Create property with optional images
router.post("/", uploadMultiple, handleUploadErrors, createProperty);

// Update property with optional images
router.put("/:id", uploadMultiple, handleUploadErrors, updateProperty);

// Delete property
router.delete("/:id", deleteProperty);

// Image-specific routes
router.post(
  "/:id/images",
  uploadMultiple,
  handleUploadErrors,
  addPropertyImages
);

router.delete("/:id/images/:filename", deletePropertyImage);

export default router;
