"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }) {
  useEffect(() => {
    console.error("Page rendering failed:", error);
  }, [error]);

  return (
    <main className="app-error" role="alert">
      <div className="app-error-card">
        <h1>We couldn&apos;t load this page</h1>
        <p>
          The page is temporarily unavailable. Please try again in a moment.
        </p>
        <div className="app-error-actions">
          <button type="button" onClick={reset}>
            Try again
          </button>
          <a href="/">Go to homepage</a>
        </div>
      </div>
    </main>
  );
}
