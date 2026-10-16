"use client";

import { useEffect } from "react";

export default function Ads() {
  useEffect(() => {
    const loadAds = () => {
      // First ad
      const adScript = document.createElement("script");
      adScript.src =
        "https://welcomingexpulsion.com/bf/9d/72/bf9d7240f3f011087fb60ee5c6fe440e.js";
      adScript.async = true;
      document.body.appendChild(adScript);
    };

    if (document.readyState === "complete") {
      loadAds();
    } else {
      window.addEventListener("load", loadAds);

      return () => {
        window.removeEventListener("load", loadAds);
      };
    }
  }, []);

  return null;
}