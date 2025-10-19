import TeamMember from "../models/TeamMember.js";
import { deleteUploadedFile, getFileUrl } from "../middleware/upload.js";
import path from "path";
import fs from "fs";

// Helper function to handle errors and send a consistent response
const sendErrorResponse = (res, message, status = 500, error) => {
  console.error(`Error: ${message}`, error);
  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && {
      error: error?.message,
      stack: error?.stack,
    }),
  });
};

// --- Team Member Controllers ---

// Create a new team member
export const createTeamMember = async (req, res) => {
  try {
    // Support two request shapes:
    // 1) JSON body: { name, role, bio, ... }
    // 2) multipart/form-data with a 'teamMember' field containing a JSON string
    let memberData = {};
    if (req.body && typeof req.body.teamMember === "string") {
      try {
        memberData = JSON.parse(req.body.teamMember);
      } catch (e) {
        // fall back to raw body (may be empty)
        memberData = { ...req.body };
      }
    } else {
      memberData = { ...(req.body || {}) };
    }

    // If a file was uploaded, prefer ImageKit's URL (req.file.url) then local filename
    if (req.file) {
      if (req.file.url) {
        memberData.image = req.file.url;
        // Also keep a local path for consistency if you need it
      } else if (req.file.filename) {
        memberData.image = getFileUrl(req.file.filename);
      }
    }

    const newMember = await TeamMember.create(memberData);

    res.status(201).json({
      success: true,
      data: newMember,
      message: "Team member created successfully",
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      return sendErrorResponse(res, "Validation failed", 400, err);
    }
    sendErrorResponse(res, "Failed to create team member", 500, err);
  }
};

// Update an existing team member
export const updateTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    // Same parsing logic as create: support a JSON string in 'teamMember' (multipart form)
    let updateData = {};
    if (req.body && typeof req.body.teamMember === "string") {
      try {
        updateData = JSON.parse(req.body.teamMember);
      } catch (e) {
        updateData = { ...req.body };
      }
    } else {
      updateData = { ...(req.body || {}) };
    }

    // Check if member exists
    const existingMember = await TeamMember.findById(id);
    if (!existingMember) {
      return sendErrorResponse(res, "Team member not found", 404);
    }

    // Handle image replacement: if a new file is uploaded, set the new path
    if (req.file) {
      if (req.file.url) {
        updateData.image = req.file.url;
      } else if (req.file.filename) {
        updateData.image = getFileUrl(req.file.filename);
      }

      // delete previous image file if it exists and is stored under /uploads
      if (existingMember.image && existingMember.image.startsWith("/uploads/")) {
        const prevFilename = path.basename(existingMember.image);
        try {
          deleteUploadedFile(prevFilename);
        } catch (err) {
          console.warn(`Could not delete old image file: ${err.message}`);
        }
      }
    }

    const updatedMember = await TeamMember.findByIdAndUpdate(id, updateData, {
      new: true, // Return the updated document
      runValidators: true,
      context: "query",
    });

    res.status(200).json({
      success: true,
      data: updatedMember,
      message: "Team member updated successfully",
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      return sendErrorResponse(res, "Validation failed", 400, err);
    }
    sendErrorResponse(res, "Failed to update team member", 500, err);
  }
};

// Delete a team member
export const deleteTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await TeamMember.findById(id);

    if (!member) {
      return sendErrorResponse(res, "Team member not found", 404);
    }

    // Attempt to delete the associated image file
    if (member.image) {
      try {
        const imagePath = `path/to/your/uploads/${member.image}`; // Adjust this path
        if (fs.existsSync(imagePath)) {
          deleteUploadedFile(imagePath);
        }
      } catch (err) {
        console.warn(
          `Could not delete image file for member ${id}: ${err.message}`
        );
      }
    }

    await member.deleteOne();

    res.status(200).json({
      success: true,
      message: "Team member deleted successfully",
    });
  } catch (err) {
    sendErrorResponse(res, "Failed to delete team member", 500, err);
  }
};

// Get all team members
export const getAllTeamMembers = async (req, res) => {
  try {
    const members = await TeamMember.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: members.length,
      data: members,
    });
  } catch (err) {
    sendErrorResponse(res, "Failed to fetch team members", 500, err);
  }
};

// Get a single team member by ID
export const getTeamMemberById = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await TeamMember.findById(id);

    if (!member) {
      return sendErrorResponse(res, "Team member not found", 404);
    }

    res.status(200).json({
      success: true,
      data: member,
    });
  } catch (err) {
    sendErrorResponse(res, "Failed to fetch team member", 500, err);
  }
};
