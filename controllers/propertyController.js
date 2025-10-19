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

// Sanitize and normalize incoming property data
const sanitizePropertyData = (raw) => {
  const data = { ...(raw || {}) };

  // Coerce numeric fields
  const toNumber = (v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  };

  data.price = toNumber(data.price) ?? data.price;
  data.area = toNumber(data.area) ?? data.area;
  data.bedrooms = toNumber(data.bedrooms) ?? data.bedrooms;
  data.bathrooms = toNumber(data.bathrooms) ?? data.bathrooms;
  data.yearBuilt = toNumber(data.yearBuilt) ?? data.yearBuilt;

  // Boolean
  if (data.featured !== undefined) {
    if (typeof data.featured === "string") {
      data.featured = data.featured === "true" || data.featured === "1";
    } else {
      data.featured = Boolean(data.featured);
    }
  }

  // Parse arrays that may come as CSV strings from form-data
  const parseArrayField = (field) => {
    if (!data[field]) return undefined;
    if (Array.isArray(data[field])) return data[field];
    if (typeof data[field] === "string") {
      return data[field]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return undefined;
  };

  const amenities = parseArrayField("amenities");
  if (amenities) data.amenities = amenities;
  const features = parseArrayField("features");
  if (features) data.features = features;
  const services = parseArrayField("services");
  if (services) data.services = services;

  // Normalize location
  if (!data.location) data.location = {};
  if (typeof data.location === "string") {
    try {
      data.location = JSON.parse(data.location);
    } catch {
      // fallback: leave as is
      data.location = { address: String(data.location) };
    }
  }
  data.location.address = data.location.address || data.location.address === 0 ? String(data.location.address) : data.location.address;
  data.location.city = data.location.city || data.location.city === 0 ? String(data.location.city) : data.location.city;
  data.location.neighborhood = data.location.neighborhood || data.location.neighborhood === 0 ? String(data.location.neighborhood) : data.location.neighborhood;
  data.location.coordinates = data.location.coordinates || {};
  // Coerce coords
  data.location.coordinates.lat = toNumber(data.location.coordinates.lat) ?? data.location.coordinates.lat ?? 0;
  data.location.coordinates.lng = toNumber(data.location.coordinates.lng) ?? data.location.coordinates.lng ?? 0;

  // Normalize images if provided as array of strings
  if (data.images && Array.isArray(data.images)) {
    data.images = data.images.map((img) => {
      if (!img) return null;
      if (typeof img === "string") {
        return { url: img, filename: null, originalName: null };
      }
      // if object, keep as-is
      return img;
    }).filter(Boolean);
  }

  return data;
};

// Process uploaded files with additional validation
const processUploadedFiles = (files = []) => {
  if (!Array.isArray(files)) {
    throw new Error("Files must be an array");
  }

  return files.map((file) => {
    // Support two file shapes:
    // - Local disk multer file: { filename, originalname, path, size, mimetype }
    // - ImageKit/memory file: { url, fileId, originalname, size, mimetype }

    // If ImageKit returned a URL, prefer it directly
    if (file.url) {
      return {
        url: file.url,
        filename: file.fileId || file.publicId || null,
        originalName: file.originalname || file.name || null,
        size: file.size || null,
        mimetype: file.mimetype || null,
        path: file.path || null,
        uploadedAt: new Date(),
      };
    }

    // Fallback to local disk file shape
    if (!file.filename) {
      // Don't throw here; instead mark as invalid so caller can decide.
      throw new Error("Uploaded file missing filename and url");
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
    // Debug info: log request shape for easier troubleshooting
    try {
      console.log("\n--- Incoming property request debug ---");
      console.log("URL:", req.originalUrl);
      console.log("Method:", req.method);
      console.log("Content-Type:", req.headers["content-type"] || "<none>");
      console.log("Body keys:", req.body ? Object.keys(req.body) : "<no body>");
      console.log(
        "Is property field string?",
        typeof req.body.property === "string"
      );
      console.log("Files count:", Array.isArray(files) ? files.length : 0);
      if (Array.isArray(files) && files.length > 0) {
        console.log(
          "First file summary:",
          Object.keys(files[0]).reduce((acc, k) => {
            acc[k] = typeof files[0][k];
            return acc;
          }, {})
        );
      }
      console.log("--- End debug ---\n");
    } catch (dbgErr) {
      console.error("Failed to log request debug info:", dbgErr);
    }
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

    // 1b. Sanitize/normalize incoming data (coerce types, parse CSVs, normalize location/images)
    propertyData = sanitizePropertyData(propertyData);

    // 2. Validate property data
    propertyData = validatePropertyData(propertyData);

    // 3. Process images
    // Preserve any images provided in the property JSON (e.g., external URLs)
    const providedImages = Array.isArray(propertyData.images)
      ? propertyData.images
      : [];

    if (files.length > 0) {
      const processedFiles = processUploadedFiles(files);
      // Append uploaded files to any provided image URLs/objects
      propertyData.images = [...providedImages, ...processedFiles];
    } else {
      // No uploaded files; keep provided images (may be empty)
      propertyData.images = providedImages;
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
