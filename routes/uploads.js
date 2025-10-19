import express from "express";
import {
  uploadSingle,
  uploadMultipleImages,
  handleUploadErrors,
} from "../middleware/upload.js";
import Property from "../models/Property.js";
import { protect } from "../middleware/auth.js";
import ImageKit from "imagekit";

const router = express.Router();

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

// 1. Upload single property image
router.post(
  "/property/:id/image",
  protect,
  uploadSingle,
  handleUploadErrors,
  async (req, res) => {
    try {
      const property = await Property.findById(req.params.id);
      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      // Debug log to verify received data
      console.log("Uploaded file data:", {
        url: req.file?.url,
        fileId: req.file?.fileId, // Changed from publicId to fileId
        fullFile: req.file,
      });

      if (!req.file?.url || !req.file?.fileId) {
        // Changed check to fileId
        return res.status(400).json({
          success: false,
          message: "Invalid image data: missing required fields",
          receivedData: {
            hasUrl: !!req.file?.url,
            hasFileId: !!req.file?.fileId, // Changed from hasPublicId
          },
        });
      }

      // Create image object that exactly matches schema
      const newImage = {
        url: req.file.url,
        publicId: req.file.fileId, // Maintain schema compatibility
        fileId: req.file.fileId, // Add new field
        uploadedAt: new Date(),
      };

      property.images.push(newImage);
      const savedProperty = await property.save();

      res.status(201).json({
        success: true,
        image: newImage,
        property: savedProperty,
      });
    } catch (error) {
      console.error("Save error:", error);
      res.status(500).json({
        success: false,
        message: "Database save failed",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }
);

// 2. Upload multiple property images
router.post(
  "/property/:id/images",
  protect,
  uploadMultipleImages,
  handleUploadErrors,
  async (req, res) => {
    try {
      const property = await Property.findById(req.params.id);
      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      // Verify files were processed correctly
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid images received",
        });
      }

      // Map files to schema-compatible objects
      const newImages = req.files.map((file) => {
        if (!file.url || !file.fileId) {
          // Changed to fileId
          console.error("Invalid file data:", file);
          throw new Error("Received incomplete file data");
        }

        return {
          url: file.url,
          publicId: file.fileId, // Maintain schema compatibility
          fileId: file.fileId, // Add new field
          uploadedAt: new Date(),
        };
      });

      property.images.push(...newImages);
      const savedProperty = await property.save();

      res.status(201).json({
        success: true,
        addedCount: newImages.length,
        newImages,
        property: savedProperty,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process images",
        error: error.message,
      });
    }
  }
);

// 3. Delete an image
router.delete("/property/:id/image/:fileId", protect, async (req, res) => {
  // Changed param to fileId
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    const imageIndex = property.images.findIndex(
      (img) =>
        img.fileId === req.params.fileId || img.publicId === req.params.fileId // Check both fields
    );

    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Image not found in this property",
      });
    }

    // Delete from ImageKit
    await imagekit.deleteFile(req.params.fileId);

    // Remove from array
    const [deletedImage] = property.images.splice(imageIndex, 1);
    const savedProperty = await property.save();

    res.json({
      success: true,
      message: "Image deleted successfully",
      deletedImage,
      property: savedProperty,
    });
  } catch (error) {
    console.error("Deletion error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete image",
      error: error.message,
    });
  }
});

export default router;
