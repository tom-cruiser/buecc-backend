import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import ImageKit from "imagekit";

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
// If ImageKit is configured (server-side private key), we'll use memory storage
// to forward files to ImageKit. Otherwise default to disk storage.
const imagekitEnabled = !!(
  process.env.IMAGEKIT_PRIVATE_KEY && process.env.IMAGEKIT_URL_ENDPOINT
);

let storage;
if (imagekitEnabled) {
  storage = multer.memoryStorage();
} else {
  storage = multer.diskStorage({
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
}

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

// If ImageKit is enabled, post-process uploaded files and send to ImageKit
let imagekitClient = null;
// Define placeholder middleware variables (will be assigned below)
let processSingleToImageKit = (req, res, next) => next();
let processMultipleToImageKit = (req, res, next) => next();

if (imagekitEnabled) {
  imagekitClient = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });

  // Middleware to upload a single file buffer to ImageKit
  processSingleToImageKit = async (req, res, next) => {
    try {
      if (!req.file || !req.file.buffer) return next();

      const fileBase64 = req.file.buffer.toString("base64");
      const uploadResult = await imagekitClient.upload({
        file: `data:${req.file.mimetype};base64,${fileBase64}`,
        fileName: req.file.originalname,
      });

      // Attach ImageKit response to req.file
      req.file.url = uploadResult.url;
      req.file.fileId = uploadResult.fileId;
      req.file.publicId = uploadResult.fileId;

      return next();
    } catch (err) {
      return next(err);
    }
  };

  // Middleware to upload multiple files to ImageKit
  processMultipleToImageKit = async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) return next();

      const uploadPromises = req.files.map((file) => {
        const fileBase64 = file.buffer.toString("base64");
        return imagekitClient.upload({
          file: `data:${file.mimetype};base64,${fileBase64}`,
          fileName: file.originalname,
        });
      });

      const results = await Promise.all(uploadPromises);

      // Attach url and fileId to each req.files[i]
      req.files = req.files.map((file, idx) => {
        const r = results[idx];
        return {
          ...file,
          url: r.url,
          fileId: r.fileId,
          publicId: r.fileId,
        };
      });

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

// File management utilities
export const deleteUploadedFile = (filename) => {
  if (!filename) return false;
  try {
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Deleted local file: ${filePath}`);
      return true;
    }

    // If the file doesn't exist locally and ImageKit is enabled, attempt remote deletion
    if (imagekitEnabled && imagekitClient) {
      // fire-and-forget remote deletion; don't throw to avoid breaking callers
      imagekitClient
        .deleteFile(filename)
        .then((res) => console.log(`🗑️ Deleted remote ImageKit fileId: ${filename}`))
        .catch((err) => console.warn(`⚠️ ImageKit delete failed for ${filename}:`, err.message || err));
      return true;
    }

    // Not found locally and no remote delete attempted
    return false;
  } catch (err) {
    console.error(`Error deleting file ${filename}:`, err);
    return false;
  }
};

export const getFileUrl = (filename) => {
  return `/uploads/${filename}`;
};
export { processSingleToImageKit, processMultipleToImageKit };

export default upload;
