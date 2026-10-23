"use client";

import { useEffect, useState } from "react";
import { VideoCard } from "@/components/HomeGrid";
import { getFavoriteEntries, getRecentEntries, clearFavorites, clearRecentEntries } from "@/lib/personal";

function usePersonalCollection(kind) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      const entries = kind === "favorites" ? getFavoriteEntries() : getRecentEntries();
      const routeNames = new Set(
        entries
          .map((entry) => entry?.routeName)
          .filter(
            (routeName) =>
              typeof routeName === "string" &&
              routeName.length <= 200 &&
              routeName.length > 0 &&
              !/[\u0000-\u001f]/.test(routeName)
          )
      );

      if (!routeNames.size) {
        if (active) {
          setItems([]);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch("/api/videos/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ routeNames: [...routeNames] })
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = await res.json();
        if (!Array.isArray(data.items)) {
          throw new Error("The server returned an invalid video list.");
        }

        if (!active) return;

        const filtered = data.items;
        const ordered = entries
          .map((entry) => filtered.find((item) => item.routeName === entry.routeName))
          .filter(Boolean);

        setItems(ordered);
      } catch (error) {
        console.error("Failed to load saved videos:", error);
        setItems([]);
        setError("Unable to load saved videos. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    const handleUpdate = () => load();
    window.addEventListener("p9x9-personal-update", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      active = false;
      window.removeEventListener("p9x9-personal-update", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [kind]);

  return { items, loading, error };
}

function CollectionHeader({ title, subtitle, onClear, isEnabled }) {
  return (
    <div className="collection-header">
      <div>
        <p className="eyebrow">Saved videos</p>
        <h1>{title}</h1>
      </div>
      {isEnabled && (
        <button
          type="button"
          className="collection-clear"
          onClick={() => {
            if (window.confirm("Clear all saved videos?")) onClear();
          }}
        >
          <i className="fas fa-trash-alt"></i> Clear all
        </button>
      )}
    </div>
  );
}

export function FavoritesCollection() {
  const { items, loading, error } = usePersonalCollection("favorites");

  return (
    <>
      <CollectionHeader
        title="Favorites"
        subtitle="Your bookmarked videos"
        onClear={clearFavorites}
        isEnabled={items.length > 0}
      />
      {error ? (
        <p className="collection-empty" role="alert">{error}</p>
      ) : !loading && items.length === 0 ? (
        <div className="collection-empty">
          <i className="fas fa-heart-broken"></i>
          <p>No favorite videos yet. Tap the heart on any card to save it.</p>
        </div>
      ) : (
        <div className="video-grid grid">
          {items.map((item) => (
            <VideoCard key={item.routeName} item={item} priority={false} showFavorite />
          ))}
        </div>
      )}
    </>
  );
}

export function RecentlyViewedCollection() {
  const { items, loading, error } = usePersonalCollection("recent");

  return (
    <>
      <CollectionHeader
        title="Recently viewed"
        subtitle="Your latest watch history"
        onClear={clearRecentEntries}
        isEnabled={items.length > 0}
      />
      {error ? (
        <p className="collection-empty" role="alert">{error}</p>
      ) : !loading && items.length === 0 ? (
        <div className="collection-empty">
          <i className="fas fa-history"></i>
          <p>No recent plays yet. Start watching a video to build your history.</p>
        </div>
      ) : (
        <div className="video-grid grid">
          {items.map((item) => (
            <VideoCard key={item.routeName} item={item} priority={false} showFavorite />
          ))}
        </div>
      )}
    </>
  );
}
