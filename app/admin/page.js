import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/adminAuth";
import AdminLogin from "@/components/AdminLogin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Login"
};

export default async function AdminLoginPage() {
  const admin = await getAdmin();
  if (admin) redirect("/admin/dashboard");

  return <AdminLogin />;
}