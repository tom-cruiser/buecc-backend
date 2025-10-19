import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    type: {
      type: String,
      required: true,
      enum: ["house", "apartment", "land", "commercial", "villa"],
      default: "house",
    },
    status: {
      type: String,
      enum: ["available", "under-contract", "sold", "under-construction"],
      default: "available",
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    currency: {
      type: String,
      enum: ["USD", "RWF"],
      default: "USD",
    },
    location: {
      address: {
        type: String,
        required: [true, "Address is required"],
      },
      city: {
        type: String,
        required: [true, "City is required"],
      },
      neighborhood: String,
      coordinates: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 },
      },
    },
    area: {
      type: Number,
      required: [true, "Area is required"],
      min: [0, "Area cannot be negative"],
    },
    unit: {
      type: String,
      enum: ["sqm", "sqft"],
      default: "sqm",
    },
    bedrooms: {
      type: Number,
      default: 0,
      min: [0, "Bedrooms cannot be negative"],
    },
    bathrooms: {
      type: Number,
      default: 0,
      min: [0, "Bathrooms cannot be negative"],
    },
    // --- UPDATED IMAGES FIELD TO MATCH WHAT YOUR ROUTES ARE SENDING ---
    images: [
      {
        url: String, // Public URL like '/uploads/filename.jpg'
        filename: String, // Stored filename
        originalName: String, // Original filename
        size: Number, // File size in bytes
        mimetype: String, // File type
        path: String, // Server file path
      },
    ],
    // ------------------------------------------------------------------
    amenities: {
      type: [String],
      default: [],
    },
    features: {
      type: [String],
      default: [],
    },
    yearBuilt: {
      type: Number,
      validate: {
        validator: (year) => year >= 1000 && year <= new Date().getFullYear(),
        message: "Invalid year built",
      },
    },
    featured: {
      type: Boolean,
      default: false,
    },
    propertyId: {
      type: String,
      unique: true,
      sparse: true,
    },
    listedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true, // This is already correct and handles createdAt/updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add index for frequently queried fields
propertySchema.index({ type: 1, status: 1, price: 1, "location.city": 1 });

// Virtual for formatted area (e.g., "120 sqm")
propertySchema.virtual("formattedArea").get(function () {
  return `${this.area} ${this.unit}`;
});

// Pre-save hook to auto-generate propertyId if not provided
propertySchema.pre("save", function (next) {
  if (!this.propertyId) {
    this.propertyId = `PROP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
  next();
});

const Property = mongoose.model("Property", propertySchema);
export default Property;
