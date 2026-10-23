import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/adminAuth";
import { getAdSettings } from "@/lib/adSettings";
import AdminShell from "@/components/AdminShell";
import AdSettings from "@/components/AdSettings";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ad settings"
};

export default async function AdminAdsPage() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin");

  const settings = await getAdSettings();

  return (
    <AdminShell
      title="Ad settings"
      subtitle="Turn each ad placement on or off. Changes apply to public pages."
    >
      <AdSettings initialSettings={settings} />
    </AdminShell>
  );
}
