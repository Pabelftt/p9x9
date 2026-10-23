"use client";

import { useEffect, useRef, useState } from "react";

// Shared admin list: search box + infinite scroll + lazy loading.
// type: "update" (rows + edit link) | "delete" (card + delete form)
//       | "links" (links.p9x9.com forms) | "desi" (desi.p9x9 sync forms)
export default function AdminDataList({ apiUrl, initialData, total, type }) {
  const [items, setItems] = useState(initialData || []);
  const [hasMore, setHasMore] = useState(
    (initialData || []).length < (total || 0)
  );
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const pageRef = useRef(1);
  const qRef = useRef("");
  const loadingRef = useRef(false);
  const sentinelRef = useRef(null);
  const listRef = useRef(null);

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };
      return entities[character];
    });
  }

  function safeHttpUrl(value) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return escapeHtml(parsed.toString());
      }
    } catch {}
    return "";
  }

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2000);
  }

  async function fetchPage(page, q, append) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: "10" });
      if (q) params.set("q", q);
      const res = await fetch(`${apiUrl}?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = "/admin";
        return;
      }
      const json = await res.json();
      const next = json.items || [];
      setItems((prev) => (append ? [...prev, ...next] : next));
      setHasMore(json.hasMore);
      pageRef.current = page;
    } catch (err) {
      console.error(err);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  function handleSearch() {
    const input = document.getElementById("adminSearchInput");
    const q = input ? input.value.trim() : "";
    qRef.current = q;
    fetchPage(1, q, false);
  }

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          fetchPage(pageRef.current + 1, qRef.current, true);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, apiUrl]);

  useEffect(() => {
    if (type !== "links" && type !== "desi") return;

    // global copy/paste/clear handlers (same as old linksP9X9 page)
    window.copyInput = (btn) => {
      const input = btn.closest(".adm-input-group").querySelector("input");
      navigator.clipboard.writeText(input.value);
      showToast("Copied");
    };
    window.pasteInput = async (btn) => {
      const input = btn.closest(".adm-input-group").querySelector("input");
      try {
        input.value = await navigator.clipboard.readText();
        showToast("Pasted");
      } catch {
        showToast("Blocked");
      }
    };
    window.clearInput = (btn) => {
      const input = btn.closest(".adm-input-group").querySelector("input");
      input.value = "";
      showToast("Cleared");
    };

    // hide + localStorage (same as old allData.ejs)
    window.hideData = (id) => {
      const card = document.getElementById("card-" + id);
      if (card) card.style.display = "none";
      try {
        localStorage.setItem("hide_" + id, "true");
      } catch {}
      showToast("Hidden");
    };
  }, [type]);

  function createField(icon, name, value, placeholder, typeAttr = "text") {
    return `
      <div class="adm-input-group">
        <label class="adm-input-label">${escapeHtml(placeholder)}</label>
        <div class="adm-input-row">
          <div class="adm-input-box">
            <i class="fas ${escapeHtml(icon)}"></i>
            <input name="${escapeHtml(name)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" type="${escapeHtml(typeAttr)}" autocomplete="off">
          </div>
          <div class="adm-input-tools">
            <button type="button" class="adm-chip chip-copy" title="Copy" onclick="window.copyInput(this)"><i class="fas fa-copy"></i></button>
            <button type="button" class="adm-chip chip-paste" title="Paste" onclick="window.pasteInput(this)"><i class="fas fa-paste"></i></button>
            <button type="button" class="adm-chip chip-clear" title="Clear" onclick="window.clearInput(this)"><i class="fas fa-eraser"></i></button>
          </div>
        </div>
      </div>
    `;
  }

  function desiLinkGroup(label, value, readOnly = true) {
    return `
      <div class="adm-input-group">
        <label class="adm-input-label">${escapeHtml(label)}</label>
        <div class="adm-input-row">
          <div class="adm-input-box">
            <i class="fas fa-link"></i>
            <input value="${escapeHtml(value)}" ${readOnly ? "readonly" : ""} ${!readOnly ? `name="${label === "Route Name" ? "id" : label === "Title" ? "hadding" : label === "Image Link" ? "img" : "play"}"` : ""}>
          </div>
          <div class="adm-input-tools">
            <button type="button" class="adm-chip chip-copy" title="Copy" onclick="window.copyInput(this)"><i class="fas fa-copy"></i></button>
            <button type="button" class="adm-chip chip-paste" title="Paste" onclick="window.pasteInput(this)"><i class="fas fa-paste"></i></button>
            <button type="button" class="adm-chip chip-clear" title="Clear" onclick="window.clearInput(this)"><i class="fas fa-eraser"></i></button>
          </div>
        </div>
      </div>
    `;
  }

  function cardHtml(item) {
    if (type === "update") {
      return `
        <li class="adm-row">
          <img class="adm-row-thumb" src="${safeHttpUrl(item.imageLink)}" alt="" loading="lazy">
          <div class="adm-row-body">
            <b class="adm-row-title">${escapeHtml(item.title)}</b>
            <small class="adm-row-sub">/${escapeHtml(item.routeName)}</small>
          </div>
          <a href="/admin/update/${encodeURIComponent(String(item._id))}" class="adm-btn adm-btn-blue adm-btn-sm">
            <i class="fas fa-pen"></i> Edit
          </a>
        </li>
      `;
    }

    if (type === "delete") {
      return `
        <div class="adm-post-card">
          <img src="${safeHttpUrl(item.imageLink)}" alt="${escapeHtml(item.title)}" loading="lazy">
          <div class="adm-post-card-body">
            <h3>${escapeHtml(item.title)}</h3>
            <p><span>Route</span> /${escapeHtml(item.routeName)}</p>
            <p><span>Duration</span> ${escapeHtml(item.duration || "—")}</p>
            <p><span>Views</span> ${escapeHtml(item.totalView ?? 0)}</p>
            <p><span>Category</span> ${
              escapeHtml(Array.isArray(item.category) ? item.category.join(", ") : item.category || "—")
            }</p>
            <form action="/api/admin/delete" method="POST" class="adm-delete-form">
              <input type="hidden" name="routeName" value="${escapeHtml(item.routeName)}">
              <button type="submit" class="adm-btn adm-btn-danger adm-btn-sm">
                <i class="fas fa-trash-can"></i> Delete
              </button>
            </form>
          </div>
        </div>
      `;
    }

    // type === "links"
    return `
      <form method="POST" action="https://links.p9x9.com/create" class="adm-form-card">
        <div class="adm-form-card-head">
          <b>${escapeHtml(item.title)}</b>
          <div class="adm-media-links">
            <a href="${safeHttpUrl(item.imageLink)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-eye"></i> Open</a>
            <a href="/download?url=${encodeURIComponent(item.imageLink)}"><i class="fas fa-download"></i> Download</a>
          </div>
        </div>
        ${createField("fa-link", "routeName", item.routeName, "Route Name")}
        ${createField("fa-heading", "title", item.title, "Title")}
        ${createField("fa-image", "imageLink", item.imageLink, "Image Link")}
        ${createField("fa-video", "videoLink", item.videoLink, "Video Link")}
        ${createField("fa-align-left", "description", item.description, "Description")}
        ${createField("fa-file-lines", "shortDescription", item.shortDescription, "Short Description")}
        ${createField("fa-eye", "totalView", "0", "Total View", "number")}
        ${createField("fa-clock", "duration", item.duration, "Duration")}
        ${createField("fa-tags", "category", item.category, "Category")}
        <div class="adm-form-card-actions">
          <button class="adm-btn adm-btn-primary adm-btn-sm" type="submit">
            <i class="fas fa-paper-plane"></i> Publish Post
          </button>
          <button type="button" class="adm-btn adm-btn-danger-soft adm-btn-sm hide-btn">Hide</button>
        </div>
      </form>
    `;
  }

  function desiCardHtml(item) {
    return `
      <form class="adm-form-card" id="card-${escapeHtml(item._id)}" action="https://movieb-f42x.onrender.com/add/p9x9-signle-data" method="post">
        <div class="adm-form-card-head">
          <b>${escapeHtml(item.title)}</b>
          <div class="adm-media-links">
            <a href="${safeHttpUrl(item.imageLink)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-eye"></i> Open</a>
            <a href="/download?url=${encodeURIComponent(item.imageLink)}"><i class="fas fa-download"></i> Download</a>
          </div>
        </div>
        ${desiLinkGroup("DESI.P9X9.COM", `https://desi.p9x9.com/movie/${item.routeName}`)}
        ${desiLinkGroup("P9X9.COM", `https://p9x9.com/videos/${item.routeName}`)}
        ${desiLinkGroup("Route Name", item.routeName, false)}
        ${desiLinkGroup("Title", item.title, false)}
        ${desiLinkGroup("Image Link", item.imageLink, false)}
        ${desiLinkGroup("Video Link", item.videoLink, false)}
        <div class="adm-form-card-actions">
          <button class="adm-btn adm-btn-primary adm-btn-sm" type="submit">Submit</button>
          <button type="button" class="adm-btn adm-btn-danger-soft adm-btn-sm hide-btn">Hide</button>
        </div>
      </form>
    `;
  }

  function renderList() {
    listRef.current.innerHTML = items
      .map((item) => (type === "desi" ? desiCardHtml(item) : cardHtml(item)))
      .join("");

    if (type === "desi") {
      // re-apply hidden state (same as old allData.ejs)
      // getAttribute (not .id) — forms with <input name="id"> shadow the id property
      listRef.current.querySelectorAll(".adm-form-card").forEach((card) => {
        const id = (card.getAttribute("id") || "").replace("card-", "");
        try {
          if (localStorage.getItem("hide_" + id) === "true") {
            card.style.display = "none";
          }
        } catch {}
      });
    }
  }

  useEffect(() => {
    renderList();

    if (type === "delete" || type === "links") {
      const confirmForms = listRef.current.querySelectorAll(".adm-delete-form");
      confirmForms.forEach((form) => {
        form.addEventListener("submit", function (e) {
          if (!confirm("Are you sure to delete this post?")) e.preventDefault();
        });
      });

      const hideBtns = listRef.current.querySelectorAll(".hide-btn");
      hideBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const form = btn.closest(".adm-form-card");
          if (form && type === "desi") {
            const id = (form.getAttribute("id") || "").replace("card-", "");
            try {
              localStorage.setItem("hide_" + id, "true");
            } catch {}
          }
          if (form) form.remove();
          showToast("Hidden");
        });
      });
    }
  }, [items, type]);

  return (
    <>
      <div className="adm-search">
        <div className="adm-input-box">
          <i className="fas fa-magnifying-glass"></i>
          <input
            type="text"
            id="adminSearchInput"
            placeholder="Search posts by title..."
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
          />
        </div>
        <button type="button" className="adm-btn adm-btn-primary" onClick={handleSearch}>
          <i className="fas fa-magnifying-glass"></i> Search
        </button>
      </div>

      <p className="adm-count">
        <b>{total}</b> total posts{qRef.current ? ` — filtered: ${items.length} shown` : ""}
      </p>

      {items.length === 0 && !loading ? (
        <div className="adm-empty">
          <i className="fas fa-inbox"></i>
          No data found
        </div>
      ) : type === "update" ? (
        <ul className="adm-list" ref={listRef}></ul>
      ) : (
        <div
          id="adminCards"
          className={type === "desi" ? "adm-cards adm-cards-grid" : "adm-cards"}
          ref={listRef}
        ></div>
      )}

      <div ref={sentinelRef} className="adm-sentinel">
        {loading && (
          <p className="adm-loading">
            <i className="fas fa-spinner fa-spin"></i> Loading...
          </p>
        )}
        {!hasMore && items.length > 0 && (
          <p className="adm-end">All posts loaded</p>
        )}
      </div>

      <div className={`adm-toast ${toastMsg ? "show" : ""}`}>{toastMsg}</div>
    </>
  );
}