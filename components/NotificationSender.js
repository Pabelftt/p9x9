"use client";

import { useState } from "react";
import AdminIcon from "@/components/AdminIcon";

export default function NotificationSender() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [delivery, setDelivery] = useState(null);

  async function sendNotification(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError(false);
    setDelivery(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const response = await fetch("/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          imageUrl: formData.get("imageUrl"),
          body: formData.get("body"),
          url: formData.get("url")
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
      form.reset();
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
      <form className="adm-form" onSubmit={sendNotification}>
        <div className="adm-field">
          <label htmlFor="notification-title">
            <AdminIcon name="heading" className="adm-icon" />
            Notification title
          </label>
          <input
            className="adm-form-control"
            id="notification-title"
            name="title"
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
            maxLength={2048}
            placeholder="https://example.com/notification-image.jpg"
          />
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
            defaultValue="/"
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
