"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const AD_SCRIPTS = [
  {
    id: "p9x9-popunder-ad",
    setting: "popunder",
    src: "https://afders.org/1/500edc4c3e32ebf68d2d206485d50b13"
  },
  {
    id: "p9x9-social-bar-ad",
    setting: "socialBar",
    src: "https://bicea.org/14/bf9d7240f3f011087fb60ee5c6fe440e"
  }
];

export default function SiteAds() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/admin" || pathname.startsWith("/admin/")) return;

    let active = true;
    let loadedScripts = [];

    async function loadAds() {
      try {
        const response = await fetch("/api/ads", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Ad settings request failed (${response.status}).`);
        }

        const settings = await response.json();
        if (!active) return;

        loadedScripts = AD_SCRIPTS.filter(({ setting }) => settings[setting]).map(
          ({ id, src }) => {
            document.getElementById(id)?.remove();
            const script = document.createElement("script");
            script.id = id;
            script.src = src;
            script.async = true;
            script.setAttribute("data-cfasync", "false");
            document.body.appendChild(script);
            return script;
          }
        );
      } catch (error) {
        console.error("Unable to load site ads:", error);
      }
    }

    loadAds();

    return () => {
      active = false;
      loadedScripts.forEach((script) => script.remove());
    };
  }, [pathname]);

  return null;
}
