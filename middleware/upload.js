import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

// Configuration
const UPLOAD_DIR = path.join(process.cwd(), "public/uploads");
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES = 10;
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

// Ensure upload directory exists
const ensureUploadDir = () => {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log("✅ Created upload directory:", UPLOAD_DIR);
  }
};

// Configure storage for local file system
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `property_${Date.now()}_${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

// File validation
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (
    ALLOWED_MIME_TYPES.includes(file.mimetype) &&
    ALLOWED_EXTENSIONS.includes(ext)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Only ${ALLOWED_EXTENSIONS.join(
          ", "
        )} formats allowed`
      ),
      false
    );
  }
};

// Configure multer
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter,
});

// Error handling middleware
export const handleUploadErrors = (err, req, res, next) => {
  if (!err) return next();

  console.error(`[Upload Error] ${err.message}`);

  let status = 400;
  let message = "Image upload failed";

  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        message = `Maximum image size is ${MAX_FILE_SIZE / 1024 / 1024}MB`;
        break;
      case "LIMIT_FILE_COUNT":
        message = `Maximum ${MAX_FILES} images per upload`;
        break;
      case "LIMIT_UNEXPECTED_FILE":
        message = req.path.includes("multiple")
          ? 'Field name must be "images" for multiple uploads'
          : 'Field name must be "image" for single upload';
        break;
      default:
        message = "Image upload error";
    }
  } else if (err.message.includes("Invalid file type")) {
    message = err.message;
  } else {
    status = 500;
    message = "Server error during image processing";
  }

  return res.status(status).json({
    success: false,
    message,
    details: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
};

// Upload handlers
export const uploadSingle = upload.single("image"); // For single upload
export const uploadMultiple = upload.array("images"); // For multiple uploads
export const uploadMultipleImages = upload.array("images"); // Alias for consistency

// File management utilities
export const deleteUploadedFile = (filename) => {
  const filePath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`🗑️ Deleted file: ${filename}`);
    return true;
  }
  return false;
};

export const getFileUrl = (filename) => {
  return `/uploads/${filename}`;
};

export default upload;
