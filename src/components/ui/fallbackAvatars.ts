export function getFallbackAvatar(key: string | null | undefined) {
  const seed = key?.trim() || 'fcmoim-member';
  const hue = hashSeed(seed) % 360;
  const accentHue = (hue + 26) % 360;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="hsl(${hue}, 72%, 56%)" />
          <stop offset="100%" stop-color="hsl(${accentHue}, 76%, 38%)" />
        </linearGradient>
        <linearGradient id="shirt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f8fafc" />
          <stop offset="100%" stop-color="#dbeafe" />
        </linearGradient>
      </defs>
      <rect width="320" height="320" rx="82" fill="url(#bg)" />
      <path d="M0 214h320v106H0z" fill="#16a34a" opacity="0.84" />
      <path d="M64 232h192" stroke="#dcfce7" stroke-width="10" stroke-linecap="round" opacity="0.5" />
      <circle cx="160" cy="126" r="46" fill="#f8fafc" opacity="0.97" />
      <path d="M78 280c17-68 52-102 82-102s65 34 82 102H78z" fill="url(#shirt)" />
      <path d="M112 222c17 10 79 10 96 0" stroke="#bfdbfe" stroke-width="8" stroke-linecap="round" />
      <circle cx="250" cy="232" r="28" fill="#ffffff" stroke="#0f172a" stroke-width="6" />
      <path d="M250 211l12 9-4 15h-16l-4-15 12-9z" fill="#0f172a" />
      <path d="M243 235l-10 10M257 235l10 10M238 220l-12-4M262 220l12-4" stroke="#0f172a" stroke-width="4" stroke-linecap="round" />
      <rect x="18" y="18" width="284" height="284" rx="70" fill="none" stroke="rgba(15,23,42,0.14)" stroke-width="10" />
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function hashSeed(seed: string) {
  return [...seed].reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) >>> 0, 0);
}
