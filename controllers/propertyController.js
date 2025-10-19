import Property from "../models/Property.js";
import { deleteUploadedFile, getFileUrl } from "../middleware/upload.js";
import fs from "fs";
import path from "path";

// Helper to validate property data
const validatePropertyData = (data) => {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid property data");
  }
  return data;
};

// Process uploaded files with additional validation
const processUploadedFiles = (files = []) => {
  if (!Array.isArray(files)) {
    throw new Error("Files must be an array");
  }

  return files.map((file) => {
    if (!file.filename) {
      throw new Error("Uploaded file missing filename");
    }

    return {
      url: getFileUrl(file.filename),
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      path: file.path,
      uploadedAt: new Date(),
    };
  });
};

// Get existing images for a property
const getExistingImages = async (propertyId) => {
  if (!propertyId) {
    throw new Error("Property ID is required");
  }

  const property = await Property.findById(propertyId);
  return property?.images || [];
};

// Cleanup uploaded files on error
const cleanupFiles = (files = []) => {
  files.forEach((file) => {
    try {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
        console.log(`Cleaned up file: ${file.path}`);
      }
    } catch (err) {
      console.error(`Error cleaning up file ${file.path}:`, err);
    }
  });
};

// Main handler for create/update with images
const handlePropertyWithImages = async (req, res, isUpdate = false) => {
  let propertyData;
  let files = req.files || [];

  try {
    // 1. Parse property data
    if (req.body.property) {
      try {
        propertyData =
          typeof req.body.property === "string"
            ? JSON.parse(req.body.property)
            : req.body.property;
      } catch (err) {
        throw new Error(`Invalid property data format: ${err.message}`);
      }
    } else {
      propertyData = req.body;
    }

    // 2. Validate property data
    propertyData = validatePropertyData(propertyData);

    // 3. Process images
    if (files.length > 0) {
      const processedFiles = processUploadedFiles(files);
      propertyData.images = [
        ...(isUpdate ? await getExistingImages(req.params.id) : []),
        ...processedFiles,
      ];
    }

    // 4. Create or update property
    let property;
    if (isUpdate) {
      if (!req.params.id) {
        throw new Error("Property ID is required for update");
      }

      property = await Property.findByIdAndUpdate(req.params.id, propertyData, {
        new: true,
        runValidators: true,
        context: "query",
      });

      if (!property) {
        throw new Error("Property not found");
      }
    } else {
      property = await Property.create(propertyData);
    }

    // 5. Success response
    res.status(isUpdate ? 200 : 201).json({
      success: true,
      data: property,
      message: `Property ${isUpdate ? "updated" : "created"} successfully`,
      filesUploaded: files.length,
    });
  } catch (err) {
    // Cleanup uploaded files if error occurs
    if (files.length > 0) {
      cleanupFiles(files);
    }

    console.error(`Error ${isUpdate ? "updating" : "creating"} property:`, err);

    res.status(400).json({
      success: false,
      message: `Failed to ${isUpdate ? "update" : "create"} property`,
      error: err.message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }
};

// Create Property
export const createProperty = async (req, res) => {
  await handlePropertyWithImages(req, res, false);
};

// Update Property
export const updateProperty = async (req, res) => {
  await handlePropertyWithImages(req, res, true);
};

// Get All Properties
export const getAllProperties = async (req, res) => {
  try {
    const { featured, type, minPrice, maxPrice } = req.query;
    const filter = {};

    if (featured) filter.featured = featured === "true";
    if (type) filter.type = type;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const properties = await Property.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: properties.length,
      data: properties,
    });
  } catch (err) {
    console.error("Error fetching properties:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching properties",
      error: err.message,
    });
  }
};

// Get Single Property
export const getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate(
      "listedBy",
      "name email phone"
    );

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    res.json({
      success: true,
      data: property,
    });
  } catch (err) {
    console.error("Error fetching property:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching property",
      error: err.message,
    });
  }
};

// Delete Property
export const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Delete all associated images
    if (property.images?.length > 0) {
      property.images.forEach((image) => {
        try {
          if (image.path) {
            deleteUploadedFile(image.path);
          }
        } catch (err) {
          console.error(`Error deleting image ${image.filename}:`, err);
        }
      });
    }

    await property.deleteOne();

    res.json({
      success: true,
      message: "Property deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting property:", err);
    res.status(500).json({
      success: false,
      message: "Error deleting property",
      error: err.message,
    });
  }
};

// Add Images to Property
export const addPropertyImages = async (req, res) => {
  const files = req.files || [];

  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      cleanupFiles(files);
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No images provided",
      });
    }

    const newImages = processUploadedFiles(files);
    property.images.push(...newImages);

    const savedProperty = await property.save();

    res.status(200).json({
      success: true,
      addedCount: newImages.length,
      newImages,
      property: savedProperty,
    });
  } catch (err) {
    cleanupFiles(files);
    console.error("Error adding images:", err);
    res.status(500).json({
      success: false,
      message: "Error adding images",
      error: err.message,
    });
  }
};

// Delete Image from Property
export const deletePropertyImage = async (req, res) => {
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
        img.filename === req.params.filename ||
        img._id.toString() === req.params.filename
    );

    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Image not found in this property",
      });
    }

    const [deletedImage] = property.images.splice(imageIndex, 1);

    try {
      if (deletedImage.path) {
        deleteUploadedFile(deletedImage.path);
      }
    } catch (err) {
      console.error(`Error deleting file ${deletedImage.filename}:`, err);
    }

    await property.save();

    res.json({
      success: true,
      message: "Image deleted successfully",
      deletedImage,
    });
  } catch (err) {
    console.error("Error deleting image:", err);
    res.status(500).json({
      success: false,
      message: "Error deleting image",
      error: err.message,
    });
  }
};
