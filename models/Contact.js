import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    contact:{mongoose.schema.Types.ObjectId,
      ref: "Contact",
      required: true, 
    }
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    subject: { type: String, required: true },
    message: { type: String, required: true },
    serviceType: { type: String, default: "general" },
  },
  { timestamps: true }
);

export default mongoose.model("Contact", contactSchema);
