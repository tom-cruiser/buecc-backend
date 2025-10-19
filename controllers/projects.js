import Project from "../models/Project.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs"; // Import Node.js File System module

// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define the absolute path to the uploads directory inside backend's public/uploads
// This aligns with the rest of the app which serves static files from /uploads
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

// Ensure the uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR); // Use the defined absolute path
  },
  filename: (req, file, cb) => {
    // Generate a unique filename, keeping the original extension
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/; // Added webp for modern images
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(
        new Error("Error: Only images (jpeg, jpg, png, gif, webp) are allowed!")
      );
    }
  },
}).array("images", 10); // Expects an array of files under the field name "images", max 10

// Helper function to process services string/array
const processServices = (servicesInput) => {
  if (Array.isArray(servicesInput)) {
    return servicesInput;
  }
  if (typeof servicesInput === "string") {
    // Split by comma, trim whitespace, and filter out empty strings
    return servicesInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return []; // Default to empty array if servicesInput is undefined or null
};

// Create a new project
// Multer middleware will now be applied in the router directly
const createProject = async (req, res, next) => {
  try {
    // req.body contains text fields
    // req.files contains uploaded files (because .array() was used)

    const {
      title,
      description,
      category,
      completionDate,
      location,
      clientTestimonial,
      services, // This comes from req.body
    } = req.body;

    // Get uploaded image paths relative to the public URL
    const images =
      req.files && Array.isArray(req.files)
        ? req.files.map((file) => {
            // Support ImageKit return (file.url) or local disk (file.filename)
            if (file.url) return file.url;
            if (file.filename) return `/uploads/${file.filename}`;
            return null;
          }).filter(Boolean)
        : [];

    const project = new Project({
      title,
      description,
      category,
      completionDate,
      location,
      clientTestimonial: clientTestimonial || "", // Default to empty string if not provided
      services: processServices(services), // Use the helper function
      images: images, // Store the array of web-accessible URLs
    });

    await project.save();
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    console.error("Error in createProject:", error);
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({
          success: false,
          message: error.message,
          details: error.errors,
        });
    }
    next(error); // Pass other errors to a global error handler
  }
};

// Get all projects
const getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find();
    res
      .status(200)
      .json({ success: true, count: projects.length, data: projects });
  } catch (error) {
    console.error("Error in getProjects:", error);
    next(error);
  }
};

// Get single project
const getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }
    res.status(200).json({ success: true, data: project });
  } catch (error) {
    console.error("Error in getProject:", error);
    if (error.name === "CastError") {
      // Mongoose error for invalid ID format
      return res
        .status(400)
        .json({ success: false, message: "Invalid Project ID format" });
    }
    next(error);
  }
};

// Update project
// Multer middleware will now be applied in the router directly
const updateProject = async (req, res, next) => {
  try {
    let project = await Project.findById(req.params.id);
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    const {
      title,
      description,
      category,
      completionDate,
      location,
      clientTestimonial,
      services, // This comes from req.body
      // If you implement a way to remove specific images, you'd need a field here
      // For now, new images are just appended.
      // If you want to replace ALL images, you'd clear project.images first.
    } = req.body;

    // Update basic fields
    project.title = title !== undefined ? title : project.title;
    project.description =
      description !== undefined ? description : project.description;
    project.category = category !== undefined ? category : project.category;
    project.completionDate =
      completionDate !== undefined ? completionDate : project.completionDate;
    project.location = location !== undefined ? location : project.location;
    project.clientTestimonial =
      clientTestimonial !== undefined
        ? clientTestimonial
        : project.clientTestimonial;

    // Process services field
    project.services = processServices(
      services !== undefined ? services : project.services
    );

    // Add new images if any are uploaded in this request
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const newImagePaths = req.files
        .map((file) => {
          if (file.url) return file.url;
          if (file.filename) return `/uploads/${file.filename}`;
          return null;
        })
        .filter(Boolean);
      project.images = [...(project.images || []), ...newImagePaths]; // Append new images
    }

    await project.save();
    res.status(200).json({ success: true, data: project });
  } catch (error) {
    console.error("Error in updateProject:", error);
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Project ID format" });
    }
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({
          success: false,
          message: error.message,
          details: error.errors,
        });
    }
    next(error);
  }
};

// Delete project
const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    // Optional: Delete associated image files from the server
    if (project.images && Array.isArray(project.images)) {
      project.images.forEach((imagePath) => {
        try {
          // If it's a local upload path (/uploads/...), delete the disk file
          if (typeof imagePath === "string" && imagePath.startsWith("/uploads/")) {
            const absolutePath = path.join(UPLOADS_DIR, path.basename(imagePath));
            if (fs.existsSync(absolutePath)) {
              fs.unlinkSync(absolutePath);
              console.log(`Successfully deleted image file: ${absolutePath}`);
            }
          } else {
            // ImageKit or external URL: nothing to delete locally
          }
        } catch (err) {
          console.error(`Failed to delete image file: ${imagePath}`, err);
        }
      });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error("Error in deleteProject:", error);
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Project ID format" });
    }
    next(error);
  }
};

export {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  upload,
}; // Export upload middleware
