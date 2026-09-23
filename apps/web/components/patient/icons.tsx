// Ícones de traço da área do paciente (24px, traço 2, cantos arredondados).
// Decorativos: quem usa dá o nome ao botão ou ao link.
const paths = {
  home: ["m3 10 9-7 9 7", "M5 9v11h14V9", "M10 20v-6h4v6"],
  chart: ["M3 3v18h18", "m7 14 4-4 3 3 5-6"],
  plus: ["M12 5v14", "M5 12h14"],
  chat: ["M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"],
  heart: [
    "M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z",
  ],
  chevR: ["m9 18 6-6-6-6"],
  chevL: ["m15 18-6-6 6-6"],
  x: ["M18 6 6 18", "m6 6 12 12"],
  check: ["M20 6 9 17l-5-5"],
  arrow: ["M5 12h14", "m13 6 6 6-6 6"],
  camera: [
    "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z",
    "M8 13a4 4 0 1 0 8 0a4 4 0 1 0-8 0",
  ],
  alert: [
    "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
    "M12 9v4",
    "M12 17h.01",
  ],
  bell: ["M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", "M10.3 21a1.9 1.9 0 0 0 3.4 0"],
  cal: ["M3 6h18v15H3z", "M3 10h18", "M8 2v4", "M16 2v4"],
  file: ["M14 2H6v20h12V6z", "M14 2v4h4", "M9 13h6", "M9 17h6"],
  scale: ["M3 4h18v17H3z", "M8 10a5 5 0 0 1 8 0", "M12 10l2-2"],
  food: [
    "M3 2v7c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V2",
    "M6 2v20",
    "M18 22V2c-2 0-3 2-3 5s1 4 3 4",
  ],
  send: ["m22 2-7 20-4-9-9-4z", "M22 2 11 13"],
  phone: [
    "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z",
  ],
  refresh: [
    "M3 12a9 9 0 0 1 15-6.7L21 8",
    "M21 3v5h-5",
    "M21 12a9 9 0 0 1-15 6.7L3 16",
    "M3 21v-5h5",
  ],
  image: ["M3 3h18v18H3z", "M7 9.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0", "m21 15-5-5L5 21"],
  clip: ["M9 3h6v4H9z", "M9 5H5v16h14V5h-4", "M9 12h6", "M9 16h4"],
  user: ["M20 21a8 8 0 0 0-16 0", "M12 13a5 5 0 1 0 0-10a5 5 0 0 0 0 10z"],
  f1: ["M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0", "M9 9h.01", "M15 9h.01", "M16.5 17.5a5.5 5.5 0 0 0-9 0"],
  f2: ["M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0", "M9 9h.01", "M15 9h.01", "M15.5 16.5a4 4 0 0 0-7 0"],
  f3: ["M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0", "M9 9h.01", "M15 9h.01", "M8 15.5h8"],
  f4: ["M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0", "M9 9h.01", "M15 9h.01", "M8.5 14.5a4 4 0 0 0 7 0"],
  f5: ["M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0", "M9 9h.01", "M15 9h.01", "M7 13.5a5 5 0 0 0 10 0z"],
  drop: ["M12 2.7 6.3 8.3a8 8 0 1 0 11.4 0z"],
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

// A marca: o "V" dourado sobre o azul-marinho.
export function Mark({ size = 34 }: { size?: number }) {
  return (
    <span className="pv-mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 24 24" width={size * 0.66} height={size * 0.66} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M5 5l7 14 7-14" />
        <path d="M9 5l3 6.5" />
      </svg>
    </span>
  );
}
