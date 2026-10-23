"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AdminIcon from "@/components/AdminIcon";

// Edit form for a single post. Submits JSON to /api/admin/update/:id and
// navigates back to /admin/update on success (stays on the current origin).
const FIELDS = [
  { id: "routeName", label: "Route Name", icon: "route" },
  { id: "title", label: "Title", icon: "heading" },
  { id: "description", label: "Description", icon: "activity" },
  { id: "imageLink", label: "Image Link", icon: "image" },
  { id: "videoLink", label: "Video Link", icon: "video" },
  { id: "totalView", label: "Total Views", icon: "eye" },
  { id: "duration", label: "Duration", icon: "clock" },
  {
    id: "category",
    label: "Category",
    icon: "tag",
    hint: "Separate multiple categories with commas"
  }
];

export default function AdminPostForm({ id, post }) {
  const router = useRouter();
  const [toastMsg, setToastMsg] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const toastTimer = useRef(null);

  function showToast(msg) {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 2500);
  }

  async function copyInput(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
      await navigator.clipboard.writeText(input.value);
      showToast("Copied to clipboard");
    }
  }

  async function pasteInput(inputId) {
    try {
      const text = await navigator.clipboard.readText();
      document.getElementById(inputId).value = text;
      showToast("Pasted");
    } catch {
      showToast("Paste blocked by browser");
    }
  }

  function clearInput(inputId) {
    document.getElementById(inputId).value = "";
    showToast("Field cleared");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const data = Object.fromEntries(new FormData(e.target).entries());

    try {
      const res = await fetch(`/api/admin/update/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (!res.ok && res.status !== 303) {
        throw new Error("Update failed");
      }

      showToast("Post updated ✅");
      router.push("/admin/update");
    } catch (err) {
      console.error(err);
      setError("Something went wrong while updating. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="adm-card">
      <form onSubmit={handleSubmit} className="adm-form">
        {FIELDS.map((f) => (
          <div className="adm-field" key={f.id}>
            <label htmlFor={f.id}>
              {f.label}
              {f.hint && <small className="adm-label-hint"> — {f.hint}</small>}
            </label>
            <div className="adm-input-row">
              <div className="adm-input-box">
                <AdminIcon name={f.icon} className="adm-icon" />
                <input
                  id={f.id}
                  name={f.id}
                  defaultValue={
                    f.id === "category" && Array.isArray(post.category)
                      ? post.category.join(",")
                      : post[f.id] ?? ""
                  }
                  autoComplete="off"
                />
              </div>
              <div className="adm-input-tools">
                <button type="button" className="adm-chip chip-copy" onClick={() => copyInput(f.id)} title="Copy">
                  <AdminIcon name="copy" className="adm-icon" />
                </button>
                <button type="button" className="adm-chip chip-paste" onClick={() => pasteInput(f.id)} title="Paste">
                  <AdminIcon name="paste" className="adm-icon" />
                </button>
                <button type="button" className="adm-chip chip-clear" onClick={() => clearInput(f.id)} title="Clear">
                  <AdminIcon name="erase" className="adm-icon" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {error && (
          <div className="adm-alert adm-alert-error" role="alert">
            <AdminIcon name="activity" className="adm-icon" /> {error}
          </div>
        )}

        <div className="adm-form-actions">
          <a href="/admin/update" className="adm-btn adm-btn-ghost">
            <AdminIcon name="arrowLeft" className="adm-icon" /> Cancel
          </a>
          <button type="submit" className="adm-btn adm-btn-primary" disabled={loading}>
            {loading ? (
              <>
                <AdminIcon name="spinner" className="adm-icon adm-icon-spin" /> Saving...
              </>
            ) : (
              <>
                <AdminIcon name="check" className="adm-icon" /> Save Changes
              </>
            )}
          </button>
        </div>
      </form>

      <div className={`adm-toast ${toastMsg ? "show" : ""}`}>{toastMsg}</div>
    </div>
  );
}