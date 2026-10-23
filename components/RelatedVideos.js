"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

function RelatedCard({ item, priority }) {
  return (
    <a href={`/videos/${item.routeName}`} className="video-card-link">
      <div className="video-card">
        <div className="video-thumb">
          <Image
            src={item.imageLink}
            alt={item.title}
            fill
            sizes="(max-width: 480px) 50vw, 160px"
            priority={priority}
            unoptimized
          />
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
        </div>
      </div>
    </a>
  );
}

// Related Videos: 2-column grid + infinite scroll + lazy loading.
// Never shows a duplicate (current video + every already-loaded route is tracked).
export default function RelatedVideos({ currentRouteName, initialItems, total }) {
  const [items, setItems] = useState(initialItems || []);
  const [hasMore, setHasMore] = useState(
    (initialItems || []).length < (total || 0)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pageRef = useRef(1);
  const busyRef = useRef(false);
  const sentinelRef = useRef(null);
  const seenRef = useRef(
    new Set([
      currentRouteName,
      ...(initialItems || []).map((v) => v.routeName)
    ])
  );

  const loadMore = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    try {
      // keep paging until we get fresh items or run out — no duplicate ever loads twice
      while (true) {
        const next = pageRef.current + 1;
        const res = await fetch(
          `/api/videos/${currentRouteName}/related?page=${next}&limit=10`
        );
        const json = await res.json();

        const fresh = (json.items || []).filter(
          (v) => !seenRef.current.has(v.routeName)
        );
        fresh.forEach((v) => seenRef.current.add(v.routeName));
        pageRef.current = next;

        if (fresh.length > 0) {
          setItems((prev) => [...prev, ...fresh]);
          setHasMore(json.hasMore);
          break;
        }
        if (!json.hasMore) {
          setHasMore(false);
          break;
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load more videos");
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }, [currentRouteName]);

  useEffect(() => {
    if (!("IntersectionObserver" in window) || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !busyRef.current) {
          loadMore();
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <>
      <div className="related-grid">
        {items.length === 0 ? (
          <p className="grid-empty">
            <i className="fas fa-film"></i>
            No related videos
          </p>
        ) : (
          items.map((item, i) => (
            <RelatedCard key={item._id} item={item} priority={i === 0} />
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
          <p className="grid-end">All related videos loaded</p>
        )}
        {error && <p className="grid-end">{error}</p>}
      </div>
    </>
  );
}