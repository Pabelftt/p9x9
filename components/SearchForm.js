"use client";

import { useEffect, useState } from "react";

export default function SearchForm({
  action = "/",
  query = "",
  category = "",
  sort = "latest"
}) {
  const [categories, setCategories] = useState([]);
  const [showAllCategories, setShowAllCategories] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/categories", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load categories");
        return response.json();
      })
      .then((data) => {
        if (Array.isArray(data.categories)) setCategories(data.categories);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Failed to load video categories:", error);
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <div className="search-section">
      <form action={action} method="get" className="search-form" role="search">
        <i className="fas fa-search search-icon" aria-hidden="true"></i>
        <input
          type="search"
          name="q"
          defaultValue={query}
          maxLength={100}
          placeholder="Search videos..."
          aria-label="Search videos"
        />
        {category && <input type="hidden" name="category" value={category} />}
        <label className="search-sort-label">
          <span className="visually-hidden">Sort videos</span>
          <select name="sort" defaultValue={sort} aria-label="Sort videos">
            <option value="latest">Latest</option>
            <option value="popular">Most viewed</option>
          </select>
        </label>
        <button type="submit" className="search-submit">
          <i className="fas fa-search" aria-hidden="true"></i>
          <span>Search</span>
        </button>
      </form>

      <div className="cat-pills" aria-label="Video categories">
        {(showAllCategories ? categories : categories.slice(0, 8)).map((item) => {
          const params = new URLSearchParams();
          params.set("category", item);
          if (query) params.set("q", query);
          if (sort !== "latest") params.set("sort", sort);
          return (
            <a
              key={item}
              className={`cat-pill${category === item ? " active" : ""}`}
              href={`${action}?${params.toString()}`}
            >
              {item}
            </a>
          );
        })}
        {!showAllCategories && categories.length > 8 && (
          <button
            type="button"
            className="cat-pill more"
            onClick={() => setShowAllCategories(true)}
          >
            All categories
          </button>
        )}
        {category && (
          <a className="cat-pill more" href={action}>
            Clear filters
          </a>
        )}
      </div>
    </div>
  );
}
