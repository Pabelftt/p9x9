import { connectDB } from "@/lib/db";
import SiteAdSettings from "@/models/SiteAdSettings";

export const DEFAULT_AD_SETTINGS = {
  popunder: true,
  socialBar: true,
  videoRedirect: true
};

export async function getAdSettings() {
  await connectDB();
  const settings = await SiteAdSettings.findOne({ key: "site" }).lean();

  return settings
    ? {
        popunder: settings.popunder,
        socialBar: settings.socialBar,
        videoRedirect: settings.videoRedirect
      }
    : DEFAULT_AD_SETTINGS;
}
