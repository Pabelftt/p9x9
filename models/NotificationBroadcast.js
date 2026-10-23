import mongoose from "mongoose";

const notificationBroadcastSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 80 },
    body: { type: String, required: true, maxlength: 200 },
    imageUrl: { type: String, required: true, maxlength: 2048 },
    url: { type: String, required: true, maxlength: 2048 },
    total: { type: Number, required: true, default: 0 },
    sent: { type: Number, required: true, default: 0 },
    failed: { type: Number, required: true, default: 0 },
    failureStatusCodes: { type: Map, of: Number, default: () => ({}) },
    removedExpired: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ["sending", "completed", "failed"],
      required: true,
      default: "sending"
    }
  },
  { timestamps: true }
);

notificationBroadcastSchema.index({ createdAt: -1 });

export default mongoose.models.NotificationBroadcast ||
  mongoose.model("NotificationBroadcast", notificationBroadcastSchema);
