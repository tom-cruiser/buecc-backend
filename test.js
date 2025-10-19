import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js"; // Renamed from 'router' for clarity
import propertyRoutes from "./routes/propertyRoutes.js";

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // For parsing JSON request bodies

// --- Define your API routes ---
// Mount authentication routes under /api/auth
app.use("/api/auth", authRoutes);

// Mount property routes under /api/properties
// This is the crucial addition!
app.use("/api/properties", propertyRoutes);

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
