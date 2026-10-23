"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/lib/siteConfig";
import AdminIcon from "@/components/AdminIcon";

const NAV_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "chart" },
  { href: "/admin/add", label: "Add Post", icon: "plus" },
  { href: "/admin/update", label: "Update", icon: "edit" },
  { href: "/admin/delete", label: "Delete", icon: "trash" },
  { href: "/admin/link-check", label: "Link Check", icon: "shield" },
  { href: "/admin/notifications", label: "Notifications", icon: "bell" },
  { href: "/admin/ads", label: "Ads", icon: "activity" },
  { href: "/api/data-to-bd-p9x9", label: "Data to Desi", icon: "database" },
  { href: "/admin/p9x9-to-links_p9x9", label: "P9X9 to Links", icon: "share" }
];

function isActive(pathname, href) {
  if (href === "/admin/update") {
    return pathname === "/admin/update" || pathname.startsWith("/admin/update/");
  }
  return pathname === href;
}

export default function AdminShell({ title, subtitle, actions, wide = false, children }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="adm-shell">
      <header className="adm-topbar">
        <a href="/admin/dashboard" className="adm-brand">
          <span className="adm-brand-name">{siteConfig.websiteName}</span>
          <span className="adm-brand-badge">Admin</span>
        </a>

        <nav className="adm-nav" aria-label="Admin navigation">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`adm-nav-link ${isActive(pathname, link.href) ? "active" : ""}`}
            >
              <AdminIcon name={link.icon} className="adm-icon" />
              {link.label}
            </a>
          ))}
        </nav>

        <div className="adm-topbar-right">
          <a href="/" className="adm-btn adm-btn-ghost adm-topbar-site" title="Visit site">
            <AdminIcon name="globe" className="adm-icon" />
            <span>Site</span>
          </a>
          <a href="/admin/logout" className="adm-btn adm-btn-danger-soft adm-topbar-logout">
            <AdminIcon name="logout" className="adm-icon" />
            <span>Logout</span>
          </a>
          <button
            type="button"
            className="adm-burger"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <AdminIcon name={open ? "close" : "menu"} className="adm-icon" />
          </button>
        </div>
      </header>

      {open && (
        <>
          <div className="adm-overlay" onClick={() => setOpen(false)}></div>
          <nav className="adm-drawer" aria-label="Admin mobile navigation">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`adm-drawer-link ${isActive(pathname, link.href) ? "active" : ""}`}
                onClick={() => setOpen(false)}
              >
                <AdminIcon name={link.icon} className="adm-icon" />
                {link.label}
              </a>
            ))}
            <div className="adm-drawer-sep"></div>
            <a href="/" className="adm-drawer-link">
              <AdminIcon name="globe" className="adm-icon" /> Visit Site
            </a>
            <a href="/admin/logout" className="adm-drawer-link danger">
              <AdminIcon name="logout" className="adm-icon" /> Logout
            </a>
          </nav>
        </>
      )}

      <main className={`adm-main ${wide ? "adm-main-wide" : ""}`}>
        {(title || actions) && (
          <div className="adm-page-head">
            <div className="adm-page-head-text">
              {title && <h1 className="adm-title">{title}</h1>}
              {subtitle && <p className="adm-subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="adm-page-actions">{actions}</div>}
          </div>
        )}
        {children}
      </main>

    </div>
  );
}