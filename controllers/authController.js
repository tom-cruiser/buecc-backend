import User from "../models/User.js";
import jwt from "jsonwebtoken";

// 🔐 Generate JWT with full user payload
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
};

// 🆕 POST /api/auth/register
export const registerAdmin = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    // 🔐 Add role when creating
    const admin = await User.create({
      name,
      email,
      password,
      role: "admin", // <-- REQUIRED for role-based access
    });

    res.status(201).json({
      message: "Admin registered successfully",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Registration failed", error: err.message });
  }
};

// 🆕 POST /api/auth/login
export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await User.findOne({ email }).select("+password");
    if (!admin || !(await admin.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(admin);

    res.status(200).json({
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

// 🆕 GET /api/auth/verify
export const verifyTokenRoute = async (req, res) => {
  try {
    // `req.user` should be set by middleware (protect)
    if (!req.user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    res.status(200).json({
      user: req.user,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Token verification failed", error: err.message });
  }
};
