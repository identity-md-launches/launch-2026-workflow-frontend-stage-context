export function Icon({
  name,
  size = 20,
}: {
  name:
    | "arrow"
    | "external"
    | "wallet"
    | "check"
    | "chevron"
    | "copy"
    | "refresh"
    | "shield"
    | "grid"
    | "close";
  size?: number;
}) {
  const paths = {
    arrow: "M4 12h16m-6-6 6 6-6 6",
    external: "M14 4h6v6m0-6L10 14M10 4H4v16h16v-6",
    wallet: "M3 7V5h15v3M3 8h18v12H3V8Zm12 4h6v5h-6v-5Z",
    check: "m5 12 4 4L19 6",
    chevron: "m6 9 6 6 6-6",
    copy: "M9 8h11v13H9zM15 8V3H4v13h5",
    refresh:
      "M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3",
    shield: "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6",
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    close: "m6 6 12 12M6 18 18 6",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function Mark() {
  return (
    <svg width="26" height="30" viewBox="0 0 26 30" aria-hidden="true">
      <path fill="currentColor" d="M1 1h24v6H8v6h14v6H8v10H1z" />
    </svg>
  );
}
