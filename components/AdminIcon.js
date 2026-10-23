const ICON_PATHS = {
  activity: "M3 12h4l3-8 4 16 3-8h4",
  arrowLeft: "m15 18-6-6 6-6M9 12h12",
  arrowRight: "M4 12h16m-7-7 7 7-7 7",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  chart: "M3 3v18h18M8 15l4-4 3 3 6-7",
  check: "m5 12 4 4L19 6",
  clock: "M12 8v4l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  close: "m18 6-12 12M6 6l12 12",
  copy: "M8 8V4h12v12h-4M4 8h12v12H4z",
  database: "M12 5c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3Zm-8-3v6c0 1.7 3.6 3 8 3s8-1.3 8-3V2M4 8v6c0 1.7 3.6 3 8 3 1.5 0 2.9-.2 4-.6M4 14v6c0 1.7 3.6 3 8 3 1.4 0 2.8-.2 3.9-.6",
  edit: "m16 4 4 4M4 20l4-.8L19 8a2.8 2.8 0 0 0-4-4L4 15z",
  erase: "m3 14 8-8a2 2 0 0 1 3 0l7 7-7 7H7zM12 20l5-5",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  globe: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20",
  heading: "M4 5v14M20 5v14M4 12h16",
  image: "M4 4h16v16H4zM8 10h.01M20 16l-5-5L5 20",
  key: "M21 2l-2 2m-7.5 7.5a5 5 0 1 1-7.07 0 5 5 0 0 1 7.07 0ZM12 12l5-5m0 0 3 3m-3-3 3-3",
  login: "M10 17l5-5-5-5m5 5H3m9-9h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-8",
  lock: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
  logout: "M14 17l5-5-5-5m5 5H8m4 9H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7",
  menu: "M4 6h16M4 12h16M4 18h16",
  paste: "M8 4h8l1 3h3v14H4V7h3zM9 4V2h6v2",
  plus: "M12 5v14M5 12h14",
  route: "M5 3h6v6H5zM13 15h6v6h-6zM11 6h3a3 3 0 0 1 3 3v6M8 9v3a3 3 0 0 0 3 3h2",
  send: "m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13",
  share: "M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7",
  shield: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Zm-3-11 2 2 4-4",
  spinner: "M12 3a9 9 0 1 0 9 9",
  tag: "M20 13 11 22 2 13V4h9zM7 8h.01",
  trash: "M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m4 4v7m6-7v7",
  user: "M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
  video: "m22 8-6 4 6 4V8ZM2 6h14v12H2z"
};

export default function AdminIcon({ name, className = "", title }) {
  const path = ICON_PATHS[name] || ICON_PATHS.activity;

  return (
    <svg
      aria-hidden={title ? undefined : "true"}
      aria-label={title}
      className={className}
      fill="none"
      role={title ? "img" : undefined}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d={path} />
    </svg>
  );
}
