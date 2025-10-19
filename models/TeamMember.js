import mongoose from "mongoose";

// Define the schema for the TeamMember
const teamMemberSchema = new mongoose.Schema(
  {
    // The 'id' from your interface is typically represented by Mongoose's default '_id' field.
    // If you need a separate 'id' string that is not the MongoDB ObjectId, you can add it here,
    // but usually, '_id' is sufficient for unique identification.

    name: {
      type: String,
      required: true,
      trim: true, // Trim whitespace from the beginning and end of the string
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    bio: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
      trim: true,
      // You might add validation for URL format if 'image' is always a URL
      // match: /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i,
    },
    specialties: {
      type: [String], // An array of strings
      required: true,
      default: [], // Default to an empty array if not provided
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps automatically
  }
);

// Create and export the TeamMember model
export default mongoose.model("TeamMember", teamMemberSchema);
