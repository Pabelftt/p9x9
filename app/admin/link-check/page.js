import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/adminAuth";
import AdminShell from "@/components/AdminShell";
import AdminIcon from "@/components/AdminIcon";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Link Checker"
};

export default async function LinkCheckPage() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin");

  return (
    <AdminShell
      title="Link checker"
      subtitle="Validate a video or media URL before publishing or sharing it."
      wide
    >
      <div className="adm-panel adm-panel-wide">
        <form className="link-check-form" action="/api/admin/link-check" method="POST" noValidate>
          <label htmlFor="targetUrl">URL to verify</label>
          <input id="targetUrl" name="targetUrl" type="url" placeholder="https://example.com/video.mp4" required />
          <button type="submit" className="adm-btn adm-btn-primary">
            <AdminIcon name="shield" className="adm-icon" /> Check URL
          </button>
        </form>
        <p className="adm-note">
          This checks for valid http/https URLs, blocks local/private addresses, and rejects redirect-based checks.
        </p>
      </div>
    </AdminShell>
  );
}
