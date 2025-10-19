import express from "express";
import authRoutes from "./authRoutes.js";
import propertyRoutes from "./propertyRoutes.js";
import inquiryRoutes from "./inquiryRoutes.js";
import contactRoutes from "./contact.routes.js";
import newsletterRoutes from "./newsletterRoutes.js";
import projectsRoutes from "./projectsRoutes.js";
import TeamRoutes from "./TeamRoutes.js";

const router = express.Router();

// Auth routes
router.use("/auth", authRoutes);

// Property routes
router.use("/properties", propertyRoutes);

// Inquiry routes
router.use("/inquiries", inquiryRoutes);

// Contact routes
router.use("/contact", contactRoutes);

//Newsletter routes
router.use("/newsletter", newsletterRoutes);

// Projects routes
router.use("/projects", projectsRoutes);

// Team routes
router.use("/team-members", TeamRoutes); // Add the new route here

export default router;
