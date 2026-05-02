export function getFallbackAvatar(key: string | null | undefined) {
  const seed = key?.trim() || 'fcmoim-member';
  const label = seed === 'member-profile' ? 'FC' : seed.slice(0, 2).toUpperCase();
  const hue = hashSeed(seed) % 360;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="hsl(${hue}, 70%, 46%)" />
          <stop offset="100%" stop-color="hsl(${(hue + 38) % 360}, 74%, 32%)" />
        </linearGradient>
      </defs>
      <rect width="300" height="300" rx="150" fill="url(#bg)" />
      <circle cx="150" cy="118" r="48" fill="rgba(255,255,255,0.9)" />
      <path d="M68 248c15-55 52-85 82-85s67 30 82 85" fill="rgba(255,255,255,0.9)" />
      <text x="150" y="270" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="800" fill="rgba(255,255,255,0.88)">${escapeSvg(label)}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function hashSeed(seed: string) {
  return [...seed].reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) >>> 0, 0);
}

function escapeSvg(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
