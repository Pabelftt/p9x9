import mongoose from "mongoose";

const siteAdSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "site" },
    popunder: { type: Boolean, required: true, default: true },
    socialBar: { type: Boolean, required: true, default: true },
    videoRedirect: { type: Boolean, required: true, default: true }
  },
  { timestamps: true }
);

export default mongoose.models.SiteAdSettings ||
  mongoose.model("SiteAdSettings", siteAdSettingsSchema);
