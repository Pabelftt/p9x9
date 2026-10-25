"use client";

import { useEffect, useState } from "react";
import { siteConfig } from "@/lib/siteConfig";
import { FavoriteToggle, RecentlyViewedTracker } from "@/components/PersonalActions";

export default function VideoPlayer({
  routeName,
  initialData,
  hasContinued,
  continueExpiresAt,
  redirectAvailable
}) {
  const [oneData, setOneData] = useState(initialData || null);
  const [error, setError] = useState(null);
  const [showContinue, setShowContinue] = useState(false);
  const [continuePending, setContinuePending] = useState(false);
  const [continueError, setContinueError] = useState("");
  const [continueGranted, setContinueGranted] = useState(hasContinued);
  const [activeContinueExpiry, setActiveContinueExpiry] =
    useState(continueExpiresAt);
  const [videoSourceFallback, setVideoSourceFallback] = useState(false);

  // background view count increment + fresh data (same cookie logic as Express)
  useEffect(() => {
    if (!oneData) return;
    let cancelled = false;

    fetch(`/api/videos/${routeName}`)
      .then((res) => {
        if (res.status === 404) throw new Error("notfound");
        if (!res.ok) throw new Error("server");
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        if (json.oneData) setOneData(json.oneData);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.message === "notfound") setError("Video not found");
      });

    return () => {
      cancelled = true;
    };
  }, [routeName]);

  useEffect(() => {
    if (!videoSourceFallback) return;
    document.getElementById("player")?.load();
  }, [videoSourceFallback]);

  useEffect(() => {
    if (!hasContinued) return;

    const player = document.getElementById("player");
    if (!(player instanceof HTMLVideoElement)) return;

    const startPlayback = () => {
      player.play().catch((err) => {
        console.error("Video playback could not start after returning:", err);
      });
    };

    if (player.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      startPlayback();
      return;
    }

    player.addEventListener("loadeddata", startPlayback, { once: true });
    return () => player.removeEventListener("loadeddata", startPlayback);
  }, [hasContinued, routeName]);

  useEffect(() => {
    if (!activeContinueExpiry) return;

    const timeout = Math.max(0, activeContinueExpiry - Date.now());
    const timer = window.setTimeout(() => setContinueGranted(false), timeout);
    return () => window.clearTimeout(timer);
  }, [activeContinueExpiry]);

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "#ff7a8f" }}>
        <i className="fas fa-exclamation-triangle" style={{ fontSize: 30, display: "block", marginBottom: 12 }}></i>
        {error}
      </div>
    );
  }

  if (!oneData) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "#9d9db4" }}>
        Loading...
      </div>
    );
  }

  async function handleContinue() {
    if (continuePending) return;

    setContinuePending(true);
    setContinueError("");

    try {
      const response = await fetch("/api/video-continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeName })
      });
      const result = await response.json();

      if (!response.ok || !Number.isSafeInteger(result.returnExpiresAt)) {
        throw new Error(result.error || "Unable to save the video return cookie.");
      }

      setActiveContinueExpiry(result.returnExpiresAt);
      setContinueGranted(true);
      setShowContinue(false);

      const player = document.getElementById("player");
      if (result.redirectAvailable) {
        if (player instanceof HTMLVideoElement) player.pause();
        const returnPath = `/videos/${encodeURIComponent(routeName)}`;
        window.location.assign(
          `/api/video-continue?returnPath=${encodeURIComponent(returnPath)}`
        );
        return;
      }

      if (player instanceof HTMLVideoElement) {
        player.play().catch((err) => {
          console.error("Video playback could not start:", err);
        });
      }
    } catch (err) {
      console.error("Unable to prepare video redirect:", err);
      setContinueError("Unable to save your choice. Please try again.");
    } finally {
      setContinuePending(false);
    }
  }

  return (
    <>
      <RecentlyViewedTracker routeName={routeName} title={oneData.title} imageLink={oneData.imageLink} />
      <div
        className="player-wrap"
        onClickCapture={(event) => {
          if (
            continueGranted ||
            showContinue ||
            event.target !== document.getElementById("player")
          ) {
            return;
          }

          if (event.target instanceof HTMLVideoElement) {
            event.target.pause();
          }
          event.preventDefault();
          event.stopPropagation();
          setShowContinue(true);
        }}
        onPlay={(event) => {
          if (!continueGranted && !showContinue) {
            if (event.target instanceof HTMLVideoElement) {
              event.target.pause();
            }
            setShowContinue(true);
          }
        }}
      >
        <video
          id="player"
          playsInline
          controls
          preload="metadata"
          controlsList="nodownload"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          onError={() => {
            if (!videoSourceFallback) {
              setVideoSourceFallback(true);
              return;
            }
            console.error("Video could not be loaded from its source.");
          }}
          poster={oneData.imageLink}
        >
          <source
            src={
              videoSourceFallback
                ? oneData.videoLink
                : `/api/videos/${encodeURIComponent(routeName)}/media`
            }
            type="video/mp4"
          />
        </video>
        {showContinue && (
          <div className="video-continue-backdrop">
            <section
              className="video-continue-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="video-continue-title"
              aria-describedby="video-continue-description"
            >
              <div className="video-continue-icon" aria-hidden="true">
                <i className="fas fa-external-link-alt"></i>
              </div>
              <h2 id="video-continue-title">Continue to the video link?</h2>
              <p id="video-continue-description">
                {redirectAvailable
                  ? "If you continue, you will be redirected to the selected link. When you return, the video will start directly."
                  : "If you continue, the video will start directly."}
              </p>
              {continueError && (
                <p className="video-continue-error" role="alert">
                  {continueError}
                </p>
              )}
              <div className="video-continue-actions">
                <button
                  type="button"
                  className="video-continue-secondary"
                  onClick={() => setShowContinue(false)}
                  disabled={continuePending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="video-continue-primary"
                  onClick={handleContinue}
                  disabled={continuePending}
                >
                  {continuePending ? "Please wait..." : "Continue"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      <div className="player-info">
        <h1>{oneData.title}</h1>

        <div className="player-meta">
          {oneData.duration && oneData.duration !== "0" && (
            <span>
              <i className="fas fa-clock"></i> {oneData.duration}
            </span>
          )}
          <span>
            <i className="fas fa-eye"></i> {oneData.totalView} views
          </span>
          <span>
            <i className="far fa-calendar-alt"></i>{" "}
            {oneData.formattedDate ||
              new Date(oneData.createdAt).toLocaleDateString("en-US")}
          </span>
        </div>

        <div className="player-actions">
          <a
            href={siteConfig.smartLink}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="action-btn gradient"
          >
            <i className="fas fa-download"></i> Download
          </a>
          <a
            href={siteConfig.messengerLink}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="action-btn telegram"
          >
            <i className="fab fa-facebook-messenger"></i> Join Messenger Group
          </a>
          <FavoriteToggle
            routeName={routeName}
            title={oneData.title}
            imageLink={oneData.imageLink}
            className="action-btn ghost personal-action-button"
          />
          <button
            type="button"
            className="action-btn ghost"
            onClick={() => {
              navigator.clipboard
                .writeText(window.location.href)
                .then(() => {
                  const toast = document.getElementById("siteToast");
                  if (toast) {
                    toast.textContent = "Link copied to clipboard";
                    toast.classList.add("show");
                    setTimeout(() => toast.classList.remove("show"), 2000);
                  }
                });
            }}
          >
            <i className="fas fa-link"></i> Share
          </button>
        </div>

        {(oneData.category || []).length > 0 && (
          <div className="player-tags">
            {oneData.category.map((cat, i) => (
              <a key={i} href={`/?category=${encodeURIComponent(cat.trim())}`}>
                #{cat.trim()}
              </a>
            ))}
          </div>
        )}

        {oneData.description && oneData.description.trim() !== "" && (
          <div className="player-desc">{oneData.description}</div>
        )}
      </div>

      <div id="siteToast" className="site-toast"></div>
    </>
  );
}