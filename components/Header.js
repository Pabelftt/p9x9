"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/lib/siteConfig";
import NotificationToggle from "@/components/NotificationToggle";

export default function Header() {
  const pathname = usePathname();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const navToggle = document.getElementById("nav-toggle");
    if (!navToggle) return undefined;

    const closeMenu = () => {
      navToggle.checked = false;
    };

    const links = document.querySelectorAll(".nav-link, .dropdown-link");
    links.forEach((link) => link.addEventListener("click", closeMenu));

    const overlay = document.querySelector(".mobile-overlay");
    if (overlay) overlay.addEventListener("click", closeMenu);

    const closeBtn = document.getElementById("nav-close");
    if (closeBtn) closeBtn.addEventListener("click", closeMenu);

    document.addEventListener("click", (e) => {
      if (window.innerWidth > 860) {
        document.querySelectorAll(".dropdown").forEach((dropdown) => {
          const checkbox = dropdown.querySelector('input[type="checkbox"]');
          if (!dropdown.contains(e.target) && checkbox && checkbox.checked) {
            checkbox.checked = false;
          }
        });
      }
    });

    document
      .querySelectorAll(".dropdown input[type=checkbox]")
      .forEach((checkbox) => {
        const toggle = checkbox.nextElementSibling;
        if (toggle) {
          checkbox.addEventListener("change", () => {
            toggle.setAttribute("aria-expanded", checkbox.checked);
          });
        }
      });

    const controller = new AbortController();
    fetch("/api/categories", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data.categories)) {
          throw new Error("The server returned an invalid category list.");
        }
        setCategories(data.categories.slice(0, 8));
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Failed to load navigation categories:", error);
        }
      });

    return () => controller.abort();
  }, []);

  const isHome = pathname === "/";

  return (
    <header className="site-header">
      <div className="page-wrap">
        <a href="/" className="logo">
          {siteConfig.websiteName}
          <span className="logo-badge">18+</span>
        </a>

        <input type="checkbox" id="nav-toggle" aria-hidden="true" />
        <label htmlFor="nav-toggle" role="button" className="hamburger" aria-label="Toggle navigation menu">
          <i className="fas fa-bars" aria-hidden="true"></i>
        </label>

        <nav className="main-nav" aria-label="Main Navigation">
          <a href="/" className={`nav-link ${isHome ? "active" : ""}`}>
            <i className="fas fa-home"></i> Home
          </a>
          <a href="/videos" className={`nav-link ${pathname.startsWith("/videos") ? "active" : ""}`}>
            <i className="fas fa-play-circle"></i> Videos
          </a>
          <a href="/favorites" className={`nav-link ${pathname === "/favorites" ? "active" : ""}`}>
            <i className="fas fa-heart"></i> Favorites
          </a>
          <a href="/recently-viewed" className={`nav-link ${pathname === "/recently-viewed" ? "active" : ""}`}>
            <i className="fas fa-history"></i> Recent
          </a>
          <NotificationToggle />

          <div className="dropdown">
            <input type="checkbox" id="about-toggle" aria-hidden="true" />
            <label htmlFor="about-toggle" role="button" className="dropdown-toggle" aria-expanded="false" aria-haspopup="true">
              <i className="fas fa-tags"></i> Categories <i className="fas fa-caret-down dropdown-icon"></i>
            </label>
            <div className="dropdown-content">
              {categories.map((cat) => (
                <a key={cat} href={`/?category=${encodeURIComponent(cat)}`} className="dropdown-link">
                  <i className="fas fa-film"></i> {cat}
                </a>
              ))}
              <a href="/videos" className="dropdown-link">
                <i className="fas fa-th-large"></i> All Videos
              </a>
            </div>
          </div>

          <div className="dropdown">
            <input type="checkbox" id="contact-toggle" aria-hidden="true" />
            <label htmlFor="contact-toggle" role="button" className="dropdown-toggle" aria-expanded="false" aria-haspopup="true">
              <i className="fas fa-phone-alt"></i> Contact <i className="fas fa-caret-down dropdown-icon"></i>
            </label>
            <div className="dropdown-content">
              <a href={siteConfig.telegramLink} target="_blank" rel="noopener noreferrer" className="dropdown-link">
                <i className="fab fa-telegram"></i> Telegram
              </a>
              <a href={siteConfig.whatsAppLink} target="_blank" rel="noopener noreferrer" className="dropdown-link">
                <i className="fab fa-whatsapp"></i> WhatsApp
              </a>
            </div>
          </div>
        </nav>

        <div className="mobile-overlay"></div>
      </div>

      {/* FontAwesome async (non render-blocking) */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        media="print"
        onLoad={(e) => (e.currentTarget.media = "all")}
      />
    </header>
  );
}
