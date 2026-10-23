"use client";

import { useState } from "react";

const AD_TYPES = [
  { id: "popunder", label: "Popunder" },
  { id: "socialBar", label: "Social Bar" },
  { id: "videoRedirect", label: "Video redirect" }
];

export default function AdSettings({ initialSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function updateSetting(type, enabled) {
    setSaving(type);
    setMessage("");
    setError(false);
    try {
      const response = await fetch("/api/ads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, enabled })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Could not save ad settings.");
      }

      setSettings(result);
      setMessage(`${AD_TYPES.find((ad) => ad.id === type).label} turned ${enabled ? "on" : "off"}.`);
    } catch (saveError) {
      setError(true);
      setMessage(saveError.message || "Could not save ad settings.");
    } finally {
      setSaving("");
    }
  }

  return (
    <section className="adm-panel adm-panel-wide adm-ad-settings">
      <div className="adm-ad-settings-list">
        {AD_TYPES.map(({ id, label }) => (
          <fieldset className="adm-ad-setting" key={id} disabled={Boolean(saving)}>
            <legend>{label}</legend>
            <div className="adm-ad-setting-options">
              {[true, false].map((enabled) => (
                <label key={String(enabled)}>
                  <input
                    type="radio"
                    name={`ad-${id}`}
                    checked={settings[id] === enabled}
                    onChange={() => updateSetting(id, enabled)}
                  />
                  {enabled ? "On" : "Off"}
                </label>
              ))}
              <span className={`adm-ad-status ${settings[id] ? "is-on" : "is-off"}`}>
                {settings[id] ? "Active" : "Off"}
              </span>
              {saving === id && <span className="adm-ad-saving">Saving...</span>}
            </div>
          </fieldset>
        ))}
      </div>
      {message && (
        <p className={`adm-note adm-ad-result${error ? " adm-alert-error" : ""}`} role={error ? "alert" : "status"}>
          {message}
        </p>
      )}
    </section>
  );
}
