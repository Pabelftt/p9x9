// /api/data-to-bd-p9x9 - same as old shareDataController.dataPage
// (rendered as a page, list of forms that post to desi.p9x9.com backend)
// First 10 only + infinite scroll + search (no full-DB dump)
import { Suspense } from "react";
import AdminListLoader from "@/components/AdminListLoader";
import AdminListSkeleton from "@/components/AdminListSkeleton";
import AdminShell from "@/components/AdminShell";
import { getAdmin } from "@/lib/adminAuth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "All Data Forms"
};

export default async function DataToBdP9x9Page() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin");

  return (
    <AdminShell
      title="Data to Desi.P9X9"
      subtitle="Push posts to the desi.p9x9.com backend, one by one."
      wide
    >
      <Suspense fallback={<AdminListSkeleton />}>
        <AdminListLoader apiUrl="/api/admin/posts" type="desi" />
      </Suspense>
    </AdminShell>
  );
}