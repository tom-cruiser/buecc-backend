import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs"; // Added for directory handling
import connectDB from "./config/db.js";
import router from "./routes/index.js";
import "./models/Inquiry.js";

// Load environment variables
dotenv.config();

// Initialize database connection
connectDB();

// Configure __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// ========================
// Enhanced Configuration
// ========================

// 1. Configure CORS properly
const allowedOrigins = [
  process.env.FRONTEND_URL?.replace(/\/$/, ""),
  "https://buecc-frontend.onrender.com",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl requests)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        process.env.NODE_ENV === "development"
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
  })
);

// 2. Configure upload directory
const UPLOAD_DIR = path.join(__dirname, "public", "uploads");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log(`✅ Created upload directory at: ${UPLOAD_DIR}`);
}

// 3. Configure static file serving with proper headers
app.use(
  "/uploads",
  (req, res, next) => {
    // Set CORS headers for all static file requests
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Range"
    );
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  },
  express.static(UPLOAD_DIR, {
    setHeaders: (res, filePath) => {
      // Set proper caching headers for images
      if (filePath.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
        res.setHeader("Vary", "Origin");
      }
    },
    maxAge: "1y",
    immutable: true,
  })
);

// 4. Body parsers
app.use(express.json({ limit: "10mb" })); // For parsing JSON
app.use(express.urlencoded({ extended: true, limit: "10mb" })); // For form data

// 5. API Routes
app.use("/api", router);

// 6. Health Check Endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uploadDir: UPLOAD_DIR,
    exists: fs.existsSync(UPLOAD_DIR),
    writable: (() => {
      try {
        fs.accessSync(UPLOAD_DIR, fs.constants.W_OK);
        return true;
      } catch {
        return false;
      }
    })(),
  });
});

// ========================
// Error Handling
// ========================

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: "Not Found" });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error("🚨 Error:", err.stack);

  // Handle CORS errors
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "CORS Error: Origin not allowed",
      allowedOrigins:
        process.env.NODE_ENV === "development" ? allowedOrigins : undefined,
    });
  }

  // Handle other errors
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { error: err.message }),
  });
});

// Note: Server is started from `server.js` so this file only configures and
// exports the Express app. This avoids binding the port twice (which caused
// EADDRINUSE errors when `server.js` also attempted to listen).

console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
console.log(
  `🌐 CORS allowed for: ${
    process.env.FRONTEND_URL || "https://buecc-frontend.onrender.com"
  }`
);

export default app;
