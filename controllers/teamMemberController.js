import TeamMember from "../models/TeamMember.js";
import { deleteUploadedFile } from "../middleware/upload.js";
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
    const memberData = req.body;

    // The 'image' field is the path from the server's uploads folder
    // The `upload` middleware should handle saving the file and providing the path.
    // If you're using a single file upload, the path will be on `req.file`.
    // Example: const imagePath = req.file?.path;
    // For this example, we assume the `image` path is already in the request body.
    // If you need to handle file uploads, adapt the logic from the property controller.

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
    const updateData = req.body;

    // Check if member exists
    const existingMember = await TeamMember.findById(id);
    if (!existingMember) {
      return sendErrorResponse(res, "Team member not found", 404);
    }

    // Handle image replacement: if a new image is uploaded, delete the old one
    // This logic assumes `updateData.image` contains the path to the new image.
    if (updateData.image && updateData.image !== existingMember.image) {
      if (existingMember.image) {
        // Construct the full path to the old image and delete it
        try {
          const imagePath = `path/to/your/uploads/${existingMember.image}`; // Adjust this path
          if (fs.existsSync(imagePath)) {
            deleteUploadedFile(imagePath);
          }
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
