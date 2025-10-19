import express from "express";
import {
  uploadSingle,
  uploadMultiple,
  handleUploadErrors,
  processMultipleToImageKit,
  processSingleToImageKit,
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
// Create property with optional images
// If ImageKit is enabled the files are stored in memory by multer; processMultipleToImageKit
// will forward them to ImageKit and attach `url`/`fileId` to each file. If ImageKit is not
// enabled the middleware is a no-op.
router.post(
  "/",
  uploadMultiple,
  processMultipleToImageKit,
  handleUploadErrors,
  createProperty
);

// Update property with optional images (support both PUT and PATCH from different clients)
const updateMiddleware = [uploadMultiple, processMultipleToImageKit, handleUploadErrors, updateProperty];
router.put("/:id", ...updateMiddleware);
router.patch("/:id", ...updateMiddleware);

// Delete property
router.delete("/:id", deleteProperty);

// Image-specific routes
router.post(
  "/:id/images",
  uploadMultiple,
  processMultipleToImageKit,
  handleUploadErrors,
  addPropertyImages
);

router.delete("/:id/images/:filename", deletePropertyImage);

export default router;
