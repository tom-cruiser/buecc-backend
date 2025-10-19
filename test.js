import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js"; // Renamed from 'router' for clarity
import propertyRoutes from "./routes/propertyRoutes.js";
import apiRouter from "./routes/index.js";
import path from "path";

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // For parsing JSON request bodies

// Serve uploaded files at /uploads from public/uploads
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

// Mount all API routes under /api
app.use("/api", apiRouter);

// --- Define your API routes ---
// Note: specific routes are mounted via routes/index.js (apiRouter)

// Basic route for testing server status
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Generic error handling middleware (good practice)
app.use((err, req, res, next) => {
  console.error(err.stack); // Log the error stack for debugging
  res.status(500).json({ message: "Something broke!", error: err.message });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
