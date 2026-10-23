"use client";

import { useEffect, useState } from "react";
import {
  isFavorite,
  toggleFavorite,
  trackRecentlyViewed
} from "@/lib/personal";

export function FavoriteToggle({ routeName, title, imageLink, className = "" }) {
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    if (!routeName) return;
    setFavorited(isFavorite(routeName));

    const onStorage = () => setFavorited(isFavorite(routeName));
    window.addEventListener("p9x9-personal-update", onStorage);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("p9x9-personal-update", onStorage);
      window.removeEventListener("storage", onStorage);
    };
  }, [routeName]);

  const handleToggle = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const nextState = toggleFavorite({ routeName, title, imageLink });
    setFavorited(nextState.some((item) => item.routeName === routeName));
  };

  const showLabel = className.includes("personal-action-button");

  return (
    <button
      type="button"
      className={`personal-toggle favorite-toggle ${favorited ? "active" : ""} ${className}`.trim()}
      onClick={handleToggle}
      aria-label={favorited ? `Remove ${title || "video"} from favorites` : `Add ${title || "video"} to favorites`}
      title={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      <i className={favorited ? "fas fa-heart" : "far fa-heart"} aria-hidden="true" />
      {showLabel && <span>{favorited ? "Saved" : "Favorite"}</span>}
    </button>
  );
}

export function RecentlyViewedTracker({ routeName, title, imageLink }) {
  useEffect(() => {
    if (!routeName) return;
    trackRecentlyViewed({ routeName, title, imageLink });
  }, [routeName, title, imageLink]);

  return null;
}
