"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const normalized = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const output = new Uint8Array(raw.length);

  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }

  return output;
}

async function saveSubscription(subscription) {
  const response = await fetch("/api/notifications/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON())
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || "Could not save your notification subscription.");
  }
}

export default function NotificationToggle() {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
  const isConfigured = Boolean(publicKey && !publicKey.startsWith("replace-with-"));
  const [mounted, setMounted] = useState(false);
  const [permission, setPermission] = useState("default");
  const [subscribed, setSubscribed] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMounted(true);

    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    const current = Notification.permission;
    setPermission(current);
    setToastVisible(current === "default");

    if (current === "granted" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistration()
        .then(async (registration) => {
          const subscription = await registration?.pushManager.getSubscription();
          if (subscription) {
            await saveSubscription(subscription);
            setSubscribed(true);
          }
        })
        .catch((error) => {
          console.error("Unable to inspect notification subscription:", error);
          setMessage(error.message || "Unable to check your notification subscription.");
        });
    }
  }, []);

  if (!mounted || permission === "unsupported") {
    return null;
  }

  async function handleToggle() {
    setMessage("");

    if (!("serviceWorker" in navigator)) {
      setPermission("unsupported");
      setToastVisible(false);
      return;
    }

    if (!isConfigured) {
      setMessage("Notifications are not configured on this site yet.");
      setToastVisible(false);
      return;
    }

    try {
      if (subscribed) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const response = await fetch("/api/notifications/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint })
          });
          if (!response.ok) throw new Error("Could not remove the server subscription.");
          await subscription.unsubscribe();
        }
        setSubscribed(false);
        setToastVisible(false);
        return;
      }

      let currentPermission = Notification.permission;
      if (currentPermission === "default") {
        currentPermission = await Notification.requestPermission();
      }
      setPermission(currentPermission);
      setToastVisible(currentPermission === "default");

      if (currentPermission !== "granted") {
        setMessage(
          currentPermission === "denied"
            ? "Notifications are blocked in your browser settings."
            : "Choose Allow in the browser prompt to enable notifications."
        );
        return;
      }

      await navigator.serviceWorker.register("/sw.js");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      await saveSubscription(subscription);

      setSubscribed(true);
      setPermission("granted");
      setToastVisible(false);
    } catch (error) {
      console.error("Notification subscription action failed:", error);
      setMessage(error.message || "Notification setup failed. Please try again.");
    }
  }

  const className = subscribed ? "nav-link alert-on" : "nav-link";

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={handleToggle}
        aria-label={subscribed ? "Turn off browser notifications" : "Enable browser notifications"}
      >
        <i className={subscribed ? "fas fa-bell" : "far fa-bell"} aria-hidden="true"></i>{" "}
        Notification
      </button>

      {toastVisible && isConfigured && (
        <div className="notification-toast" role="dialog" aria-label="Notification permission">
          <div>
            <strong>Get notifications</strong>
            <p>Enable notifications for new videos and site updates. Your browser will ask for permission.</p>
          </div>
          <div className="notification-toast-actions">
            <button type="button" onClick={handleToggle}>Enable</button>
            <button
              type="button"
              className="notification-toast-dismiss"
              onClick={() => setToastVisible(false)}
            >
              Not now
            </button>
          </div>
        </div>
      )}
      {message && (
        <p className="notification-status" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </>
  );
}
