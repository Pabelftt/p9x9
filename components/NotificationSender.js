"use client";

import { useEffect, useState } from "react";
import AdminIcon from "@/components/AdminIcon";

const EMPTY_FIELDS = {
  title: "",
  imageUrl: "",
  body: "",
  url: "/"
};

export default function NotificationSender() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [delivery, setDelivery] = useState(null);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [posts, setPosts] = useState([]);
  const [subscriptionCount, setSubscriptionCount] = useState(null);
  const [subscriptionCountError, setSubscriptionCountError] = useState("");
  const [selectedRouteName, setSelectedRouteName] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState("");

  async function refreshSubscriptionCount() {
    try {
      const response = await fetch("/api/admin/notifications/subscriptions", {
        cache: "no-store"
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to load subscriber count.");
      }

      setSubscriptionCount(result.count);
      setSubscriptionCountError("");
    } catch (countError) {
      setSubscriptionCountError(
        countError.message || "Unable to load subscriber count."
      );
    }
  }

  useEffect(() => {
    refreshSubscriptionCount();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setPostsLoading(true);
      setPostsError("");
      try {
        const params = new URLSearchParams({ page: "1", q: search });
        const response = await fetch(`/api/admin/notifications/posts?${params}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Unable to load videos.");
        }

        setPosts(result.items);
        setPage(result.page);
        setHasMorePosts(result.hasMore);
        setSelectedRouteName("");
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          setPostsError(loadError.message || "Unable to load videos.");
        }
      } finally {
        if (!controller.signal.aborted) setPostsLoading(false);
      }
    }, search ? 250 : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  async function loadMorePosts() {
    setPostsLoading(true);
    setPostsError("");
    try {
      const params = new URLSearchParams({
        page: String(page + 1),
        q: search
      });
      const response = await fetch(`/api/admin/notifications/posts?${params}`, {
        cache: "no-store"
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to load more videos.");
      }

      setPosts((current) => [...current, ...result.items]);
      setPage(result.page);
      setHasMorePosts(result.hasMore);
    } catch (loadError) {
      setPostsError(loadError.message || "Unable to load more videos.");
    } finally {
      setPostsLoading(false);
    }
  }

  function selectPost(routeName) {
    setSelectedRouteName(routeName);
    const selectedPost = posts.find((post) => post.routeName === routeName);
    if (!selectedPost) return;

    setFields({
      title: selectedPost.title.slice(0, 80),
      imageUrl: selectedPost.imageLink,
      body: selectedPost.description.slice(0, 200),
      url: new URL(
        `/videos/${encodeURIComponent(selectedPost.routeName)}`,
        window.location.origin
      ).href
    });
    setImagePreviewError(false);
    setMessage("");
    setDelivery(null);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setFields((current) => ({ ...current, [name]: value }));
    if (name === "imageUrl") setImagePreviewError(false);
  }

  async function sendNotification(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError(false);
    setDelivery(null);

    try {
      const response = await fetch("/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fields.title,
          imageUrl: fields.imageUrl,
          body: fields.body,
          url: fields.url
        })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Notification delivery failed.");
      }
      setMessage(
        result.total === 0
          ? "No opted-in subscriptions are registered. Enable notifications from a browser first."
          : result.sent === 0
            ? `The push service rejected all ${result.total} notifications. Check the failure status below.`
            : `Accepted by the push service for ${result.sent} of ${result.total} subscriptions.`
      );
      setDelivery(result);
      setFields(EMPTY_FIELDS);
      setImagePreviewError(false);
      setSelectedRouteName("");
      refreshSubscriptionCount();
    } catch (sendError) {
      setError(true);
      setMessage(sendError.message || "Notification delivery failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="adm-panel adm-panel-wide adm-notification-panel">
      <div className="adm-notification-intro">
        <span className="adm-notification-icon">
          <AdminIcon name="bell" className="adm-icon" />
        </span>
        <div>
          <h2>Compose a notification</h2>
          <p>Keep it short and send only what subscribers need to know.</p>
        </div>
      </div>
      <div className="adm-stat adm-notification-subscriber-stat">
        <div className="adm-stat-icon tone-blue">
          <AdminIcon name="bell" className="adm-icon" />
        </div>
        <div className="adm-stat-info" aria-live="polite">
          <b>{subscriptionCount === null ? "—" : subscriptionCount}</b>
          <span>Visitors who allowed notifications</span>
          {subscriptionCountError && (
            <small className="adm-field-help adm-alert-error" role="alert">
              {subscriptionCountError}
            </small>
          )}
        </div>
      </div>
      <form className="adm-form" onSubmit={sendNotification}>
        <div className="adm-field">
          <label htmlFor="notification-video">
            <AdminIcon name="video" className="adm-icon" />
            Choose a video to fill notification details
          </label>
          <input
            className="adm-form-control"
            id="notification-video-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search videos by title"
            aria-label="Search videos"
          />
          <select
            className="adm-form-control adm-notification-video-select"
            id="notification-video"
            value={selectedRouteName}
            onChange={(event) => selectPost(event.target.value)}
            disabled={postsLoading && posts.length === 0}
          >
            <option value="">
              {postsLoading && posts.length === 0
                ? "Loading videos..."
                : posts.length
                  ? "Select a video"
                  : "No videos found"}
            </option>
            {posts.map((post) => (
              <option key={post.routeName} value={post.routeName}>
                {post.title}
              </option>
            ))}
          </select>
          {hasMorePosts && (
            <button
              className="adm-btn adm-btn-ghost adm-notification-load-more"
              type="button"
              onClick={loadMorePosts}
              disabled={postsLoading}
            >
              {postsLoading ? "Loading..." : "Load more videos"}
            </button>
          )}
          {postsError && (
            <small className="adm-field-help adm-alert-error" role="alert">
              {postsError}
            </small>
          )}
          <small className="adm-field-help">
            Choosing a video fills its title, image, description, and public video link.
          </small>
        </div>
        <div className="adm-field">
          <label htmlFor="notification-title">
            <AdminIcon name="heading" className="adm-icon" />
            Notification title
          </label>
          <input
            className="adm-form-control"
            id="notification-title"
            name="title"
            value={fields.title}
            onChange={updateField}
            maxLength={80}
            placeholder="e.g. New videos are available"
            required
          />
          <small className="adm-field-help">Up to 80 characters.</small>
        </div>
        <div className="adm-field">
          <label htmlFor="notification-image">
            <AdminIcon name="image" className="adm-icon" />
            Image URL
          </label>
          <input
            className="adm-form-control"
            id="notification-image"
            name="imageUrl"
            type="url"
            value={fields.imageUrl}
            onChange={updateField}
            maxLength={2048}
            placeholder="https://example.com/notification-image.jpg"
          />
          {fields.imageUrl.trim() && (
            <div className="adm-notification-image-preview">
              <span>Image preview</span>
              {imagePreviewError ? (
                <small className="adm-field-help adm-alert-error" role="status">
                  Unable to load this image. Check the image URL.
                </small>
              ) : (
                <img
                  src={fields.imageUrl}
                  alt="Notification image preview"
                  loading="lazy"
                  onError={() => setImagePreviewError(true)}
                />
              )}
            </div>
          )}
          <small className="adm-field-help">
            Optional. HTTPS image shown in supported browser notifications.
          </small>
        </div>
        <div className="adm-field">
          <label htmlFor="notification-body">
            <AdminIcon name="activity" className="adm-icon" />
            Message
          </label>
          <textarea
            className="adm-form-control adm-textarea"
            id="notification-body"
            name="body"
            value={fields.body}
            onChange={updateField}
            maxLength={200}
            placeholder="Write a clear message for your subscribers."
            required
            rows={4}
          />
          <small className="adm-field-help">Up to 200 characters.</small>
        </div>
        <div className="adm-field">
          <label htmlFor="notification-url">
            <AdminIcon name="globe" className="adm-icon" />
            Redirect link
          </label>
          <input
            className="adm-form-control"
            id="notification-url"
            name="url"
            type="text"
            value={fields.url}
            onChange={updateField}
            maxLength={2048}
            placeholder="https://example.com/page or /videos/example"
          />
          <small className="adm-field-help">
            Enter any HTTP or HTTPS link, or a path on this site.
          </small>
        </div>
        <button className="adm-btn adm-btn-primary adm-notification-submit" type="submit" disabled={loading}>
          <AdminIcon
            name={loading ? "spinner" : "send"}
            className={`adm-icon${loading ? " adm-icon-spin" : ""}`}
          />
          {loading ? "Sending..." : "Send to opted-in subscribers"}
        </button>
      </form>
      {message && (
        <p className={`adm-note adm-notification-result${error ? " adm-alert-error" : ""}`} role={error ? "alert" : "status"}>
          {message}
        </p>
      )}
      {delivery && (
        <div className="adm-delivery-summary" role="status">
          <div>
            <b>{delivery.sent}</b>
            <span>Accepted by push service</span>
          </div>
          <div>
            <b>{delivery.failed}</b>
            <span>Not accepted</span>
          </div>
          <div>
            <b>{delivery.total}</b>
            <span>Opted-in subscriptions</span>
          </div>
          {delivery.failureStatusCodes &&
            Object.entries(delivery.failureStatusCodes).map(([statusCode, count]) => (
              <div key={statusCode}>
                <b>{count}</b>
                <span>
                  {statusCode === "unknown"
                    ? "Unknown push service error"
                    : `Push service HTTP ${statusCode}`}
                </span>
              </div>
            ))}
          <p>
            Accepted means the browser push service received the notification;
            it cannot confirm that the user saw it.
          </p>
        </div>
      )}
    </section>
  );
}
