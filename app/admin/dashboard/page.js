// /admin/dashboard - same as old adminController.adminDashboardGet
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/adminAuth";
import { getTotalCount, getCategories } from "@/lib/data";
import { connectDB } from "@/lib/db";
import NotificationBroadcast from "@/models/NotificationBroadcast";
import AdminShell from "@/components/AdminShell";
import AdminIcon from "@/components/AdminIcon";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Dashboard"
};

const TILES = [
  { href: "/admin/add", label: "Add New Post", desc: "Publish a fresh video", icon: "plus", tone: "primary" },
  { href: "/admin/update", label: "Update Posts", desc: "Edit any existing post", icon: "edit", tone: "blue" },
  { href: "/admin/delete", label: "Delete Posts", desc: "Remove old content", icon: "trash", tone: "danger" },
  { href: "/admin/notifications", label: "Notifications", desc: "Message opted-in visitors", icon: "bell", tone: "blue" },
  { href: "/admin/ads", label: "Ad settings", desc: "Control public site ads", icon: "activity", tone: "teal" },
  { href: "/api/data-to-bd-p9x9", label: "Data to Desi", desc: "Sync posts to desi.p9x9.com", icon: "database", tone: "purple" },
  { href: "/admin/p9x9-to-links_p9x9", label: "P9X9 to Links", desc: "Push posts to links.p9x9.com", icon: "share", tone: "teal" }
];

export default async function AdminDashboardPage() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin");

  await connectDB();
  const [total, categories, broadcasts] = await Promise.all([
    getTotalCount(),
    getCategories(),
    NotificationBroadcast.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
  ]);

  return (
    <AdminShell
      title={`Welcome back, ${admin.username} 👋`}
      subtitle="Manage everything on P9X9 from one place."
      actions={
        <a href="/admin/add" className="adm-btn adm-btn-primary">
          <AdminIcon name="plus" className="adm-icon" /> New Post
        </a>
      }
    >
      <div className="adm-stats">
        <div className="adm-stat">
          <div className="adm-stat-icon tone-primary">
            <AdminIcon name="video" className="adm-icon" />
          </div>
          <div className="adm-stat-info">
            <b>{total}</b>
            <span>Total Videos</span>
          </div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-icon tone-purple">
            <AdminIcon name="tag" className="adm-icon" />
          </div>
          <div className="adm-stat-info">
            <b>{categories.length}</b>
            <span>Categories</span>
          </div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-icon tone-teal">
            <AdminIcon name="activity" className="adm-icon" />
          </div>
          <div className="adm-stat-info">
            <b>24/7</b>
            <span>Live Site</span>
          </div>
        </div>
      </div>

      <h2 className="adm-section-label">Quick actions</h2>
      <div className="adm-tiles">
        {TILES.map((tile) => (
          <a key={tile.href} href={tile.href} className="adm-tile">
            <span className={`adm-tile-icon tone-${tile.tone}`}>
              <AdminIcon name={tile.icon} className="adm-icon" />
            </span>
            <span className="adm-tile-body">
              <b>{tile.label}</b>
              <small>{tile.desc}</small>
            </span>
            <AdminIcon name="arrowRight" className="adm-icon adm-tile-arrow" />
          </a>
        ))}
      </div>

      <div className="adm-section-heading-row">
        <h2 className="adm-section-label">Recent notification delivery</h2>
        <a href="/admin/notifications" className="adm-btn adm-btn-ghost">
          <AdminIcon name="bell" className="adm-icon" /> Manage notifications
        </a>
      </div>
      {broadcasts.length === 0 ? (
        <div className="adm-empty-state">
          <AdminIcon name="bell" className="adm-icon" />
          <p>No notification broadcasts yet.</p>
        </div>
      ) : (
        <div className="adm-broadcast-list">
          {broadcasts.map((broadcast) => (
            <article className="adm-broadcast-row" key={broadcast._id.toString()}>
              <div className="adm-broadcast-copy">
                {broadcast.imageUrl && (
                  <img src={broadcast.imageUrl} alt="" loading="lazy" />
                )}
                <div>
                  <b>{broadcast.title}</b>
                  <small>
                    {new Date(broadcast.createdAt).toLocaleString()}
                  </small>
                </div>
              </div>
              <div className="adm-broadcast-metrics">
                <span className="adm-delivery-sent">
                  <AdminIcon name="check" className="adm-icon" />
                  {broadcast.sent} accepted
                </span>
                <span className="adm-delivery-failed">
                  <AdminIcon name="activity" className="adm-icon" />
                  {broadcast.failed} not accepted
                </span>
                <span className={`adm-broadcast-status status-${broadcast.status}`}>
                  {broadcast.status}
                </span>
                {Object.entries(broadcast.failureStatusCodes || {}).map(([statusCode, count]) => (
                  <small key={statusCode}>
                    {statusCode === "unknown"
                      ? `${count} unknown push service error(s)`
                      : `${count} push service HTTP ${statusCode} error(s)`}
                  </small>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </AdminShell>
  );
}