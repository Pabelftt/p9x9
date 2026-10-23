import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/adminAuth";
import AdminShell from "@/components/AdminShell";
import NotificationSender from "@/components/NotificationSender";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Send notifications"
};

export default async function AdminNotificationsPage() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin");

  return (
    <AdminShell
      title="Browser notifications"
      subtitle="Send an announcement only to visitors who explicitly opted in."
      wide
    >
      <NotificationSender />
    </AdminShell>
  );
}
