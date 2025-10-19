import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["residential", "commercial", "industrial", "renovation"],
    },
    images: [
      {
        type: String,
        required: true,
      },
    ],
    completionDate: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    clientTestimonial: {
      type: String,
      default: "",
    },
    services: [
      {
        type: String,
        required: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Project", projectSchema);
