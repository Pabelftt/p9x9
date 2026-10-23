"use client";

import { useEffect, useRef, useState } from "react";

const NOTIFICATION_PROMPT_DISMISSED_KEY = "p9x9-notification-prompt-dismissed";
const NOTIFICATION_PROMPT_REPEAT_MS = 30_000;
const NOTIFICATION_PROMPT_INITIAL_DELAY_MS = 10_000;

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
  const [publicKey, setPublicKey] = useState("");
  const [configLoaded, setConfigLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [permission, setPermission] = useState("default");
  const [subscribed, setSubscribed] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [message, setMessage] = useState("");
  const promptTimer = useRef(null);

  useEffect(() => {
    setMounted(true);

    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    const controller = new AbortController();
    fetch("/api/notifications/config", {
      cache: "no-store",
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Notification config request failed (${response.status}).`);
        }
        return response.json();
      })
      .then((config) => {
        setPublicKey(typeof config.publicKey === "string" ? config.publicKey : "");
        setConfigLoaded(true);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Unable to load notification configuration:", error);
          setConfigLoaded(true);
        }
      });

    const current = Notification.permission;
    setPermission(current);
    try {
      const dismissedAtValue = window.localStorage.getItem(
        NOTIFICATION_PROMPT_DISMISSED_KEY
      );
      const dismissedAt = Number(dismissedAtValue);
      const remaining =
        dismissedAtValue && Number.isFinite(dismissedAt)
          ? Math.max(0, NOTIFICATION_PROMPT_REPEAT_MS - (Date.now() - dismissedAt))
          : 0;

      if (current === "granted") {
        window.localStorage.removeItem(NOTIFICATION_PROMPT_DISMISSED_KEY);
        setToastVisible(false);
      } else {
        const delay = Math.max(NOTIFICATION_PROMPT_INITIAL_DELAY_MS, remaining);
        promptTimer.current = window.setTimeout(() => {
          const latestPermission = Notification.permission;
          setPermission(latestPermission);
          setToastVisible(latestPermission !== "granted");
        }, delay);
      }
    } catch (error) {
      console.error("Unable to read notification prompt preference:", error);
      promptTimer.current = window.setTimeout(() => {
        const latestPermission = Notification.permission;
        setPermission(latestPermission);
        setToastVisible(latestPermission !== "granted");
      }, NOTIFICATION_PROMPT_INITIAL_DELAY_MS);
    }

    if (current === "granted") {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .getRegistration()
          .then(async (registration) => {
            const subscription = await registration?.pushManager.getSubscription();
            if (subscription) {
              await saveSubscription(subscription);
              setSubscribed(true);
              return;
            }
            promptTimer.current = window.setTimeout(() => {
              setToastVisible(Notification.permission === "granted");
            }, NOTIFICATION_PROMPT_INITIAL_DELAY_MS);
          })
          .catch((error) => {
            console.error("Unable to inspect notification subscription:", error);
            setMessage(error.message || "Unable to check your notification subscription.");
            promptTimer.current = window.setTimeout(() => {
              setToastVisible(Notification.permission === "granted");
            }, NOTIFICATION_PROMPT_INITIAL_DELAY_MS);
          });
      } else {
        setPermission("unsupported");
      }
    }
    return () => {
      controller.abort();
      window.clearTimeout(promptTimer.current);
    };
  }, []);

  const isConfigured = Boolean(publicKey);

  function clearPromptDismissal() {
    window.clearTimeout(promptTimer.current);
    promptTimer.current = null;
    try {
      window.localStorage.removeItem(NOTIFICATION_PROMPT_DISMISSED_KEY);
    } catch (error) {
      console.error("Unable to clear notification prompt preference:", error);
    }
  }

  function dismissPrompt() {
    setToastVisible(false);
    try {
      window.localStorage.setItem(
        NOTIFICATION_PROMPT_DISMISSED_KEY,
        String(Date.now())
      );
    } catch (error) {
      console.error("Unable to save notification prompt preference:", error);
    }
    window.clearTimeout(promptTimer.current);
    promptTimer.current = window.setTimeout(() => {
      const current = Notification.permission;
      setPermission(current);
      setToastVisible(current !== "granted");
      if (current === "granted") clearPromptDismissal();
    }, NOTIFICATION_PROMPT_REPEAT_MS);
  }

  useEffect(() => {
    if (!toastVisible || !("Notification" in window)) return undefined;

    const permissionCheck = window.setInterval(() => {
      const current = Notification.permission;
      setPermission(current);
      if (current === "granted" && subscribed) {
        setToastVisible(false);
        clearPromptDismissal();
      }
    }, 2000);

    return () => window.clearInterval(permissionCheck);
  }, [toastVisible, subscribed]);

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
      if (currentPermission === "denied") {
        setPermission(currentPermission);
        setToastVisible(true);
        setMessage("Notifications are blocked. Allow them in your browser's site settings.");
        return;
      }
      if (currentPermission === "default") {
        currentPermission = await Notification.requestPermission();
      }
      setPermission(currentPermission);

      if (currentPermission !== "granted") {
        dismissPrompt();
        return;
      }

      clearPromptDismissal();
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

      {toastVisible && (
        <div className="notification-prompt-backdrop">
          <section
            className="notification-prompt"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-prompt-title"
            aria-describedby="notification-prompt-description"
          >
            <span className="notification-prompt-icon">
              <i className="fas fa-bell" aria-hidden="true"></i>
            </span>
            <h2 id="notification-prompt-title">Stay up to date</h2>
            <p id="notification-prompt-description">
              {permission === "denied"
                ? "Notifications are blocked. Change this site's notification permission in your browser settings, then return here."
                : "Allow notifications to hear about new videos and important site updates."}
            </p>
            {(!isConfigured || permission === "denied") && (
              <p className="notification-prompt-error" role="alert">
                {permission === "denied"
                  ? "After changing the browser setting, this message will close automatically."
                  : configLoaded
                    ? "Notifications are not configured on this site yet."
                    : "Checking notification setup..."}
              </p>
            )}
            <div className="notification-prompt-actions">
              <button
                type="button"
                className="notification-prompt-enable"
                onClick={handleToggle}
                disabled={!configLoaded || !isConfigured || permission === "denied"}
              >
                Enable notifications
              </button>
              <button
                type="button"
                className="notification-prompt-dismiss"
                onClick={dismissPrompt}
              >
                Maybe later
              </button>
            </div>
            <button
              type="button"
              className="notification-prompt-close"
              aria-label="Close notification message"
              onClick={dismissPrompt}
            >
              &times;
            </button>
          </section>
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
