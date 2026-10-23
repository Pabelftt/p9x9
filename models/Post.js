// models/Post.js
// Same schema as the old project

import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    routeName: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    imageLink: { type: String, required: true },
    videoLink: { type: String, required: true },
    totalView: { type: Number, default: 0 },
    duration: { type: String, default: 0 },
    category: { type: [String], required: true }
  },
  { timestamps: true }
);

postSchema.index({ totalView: -1, _id: -1 });

export default mongoose.models.Post || mongoose.model("Post", postSchema);
