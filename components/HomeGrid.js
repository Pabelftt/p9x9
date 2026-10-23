"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { FavoriteToggle } from "@/components/PersonalActions";

export function VideoCard({ item, priority, showFavorite = true }) {
  return (
    <a href={`/videos/${item.routeName}`} className="video-card-link">
      <div className="video-card">
        <div className="video-thumb">
          <Image
            src={item.imageLink}
            alt={item.title}
            fill
            sizes="(max-width: 600px) 50vw, 25vw"
            priority={priority}
            unoptimized
          />
          {showFavorite && (
            <FavoriteToggle
              routeName={item.routeName}
              title={item.title}
              imageLink={item.imageLink}
              className="video-card-favorite"
            />
          )}
          <div className="play-overlay">
            <i className="fas fa-play"></i>
          </div>
          {item.duration && item.duration !== "0" && (
            <span className="thumb-badge badge-duration">{item.duration}</span>
          )}
          <span className="thumb-badge badge-views">
            <i className="fas fa-eye"></i> {item.totalView}
          </span>
        </div>
        <div className="video-card-body">
          <h3 className="video-card-title">{item.title}</h3>
          <div className="video-card-meta">
            <span>
              <i className="far fa-calendar-alt"></i> {item.formattedDate || ""}
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}

export default function HomeGrid({
  query,
  category,
  sort,
  initialData,
  initialHasMore
}) {
  const [items, setItems] = useState(initialData || []);
  const [hasMore, setHasMore] = useState(Boolean(initialHasMore));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pageRef = useRef(1);
  const busyRef = useRef(false);
  const requestRef = useRef(null);
  const sentinelRef = useRef(null);
  const loadedNamesRef = useRef(
    new Set((initialData || []).map((item) => item.routeName))
  );

  async function loadMore() {
    if (busyRef.current || !hasMore) return;
    busyRef.current = true;
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    requestRef.current = controller;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 15_000);

    try {
      const next = pageRef.current + 1;
      const params = new URLSearchParams({ page: String(next), limit: "10" });
      if (query) params.set("q", query);
      if (category) params.set("category", category);
      if (sort) params.set("sort", sort);

      const res = await fetch(`/api/posts?${params.toString()}`, {
        signal: controller.signal
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const json = await res.json();
      if (!Array.isArray(json.items) || typeof json.hasMore !== "boolean") {
        throw new Error("The server returned an invalid video list.");
      }

      const uniqueItems = json.items.filter(
        (item) => item?.routeName && !loadedNamesRef.current.has(item.routeName)
      );
      uniqueItems.forEach((item) => loadedNamesRef.current.add(item.routeName));
      setItems((prev) => [...prev, ...uniqueItems]);
      pageRef.current = next;
      setHasMore(json.hasMore && uniqueItems.length > 0);
    } catch (err) {
      if (err.name !== "AbortError" || timedOut) {
        console.error("Failed to load more videos:", err);
        setError(
          timedOut
            ? "Loading timed out. Check your connection and retry."
            : "Failed to load more videos."
        );
      }
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller) {
        requestRef.current = null;
        busyRef.current = false;
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    busyRef.current = false;
    pageRef.current = 1;
    loadedNamesRef.current = new Set(
      (initialData || []).map((item) => item.routeName)
    );
    setItems(initialData || []);
    setHasMore(Boolean(initialHasMore));
    setError(null);
    setLoading(false);
  }, [query, category, sort, initialData, initialHasMore]);

  useEffect(() => {
    if (!("IntersectionObserver" in window) || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !busyRef.current && !error) {
          loadMore();
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, query, category, sort, error]);

  return (
    <>
      <div className="video-grid grid">
        {items.length === 0 ? (
          <p className="grid-empty">
            <i className="fas fa-film"></i>
            No videos found
          </p>
        ) : (
          items.map((item, i) => (
            <VideoCard key={item._id} item={item} priority={i < 6} />
          ))
        )}
      </div>

      <div className="grid-sentinel" ref={sentinelRef}>
        {loading && (
          <p className="grid-spinner">
            <i className="fas fa-spinner fa-spin"></i> Loading more videos...
          </p>
        )}
        {!hasMore && items.length > 0 && (
          <p className="grid-end">All videos loaded</p>
        )}
        {error && (
          <div className="grid-end" role="alert">
            <p>{error}</p>
            <button type="button" onClick={loadMore} disabled={loading}>
              Retry
            </button>
          </div>
        )}
        {!error && hasMore && !loading && (
          <button type="button" className="grid-load-more" onClick={loadMore}>
            Load more videos
          </button>
        )}
      </div>
    </>
  );
}