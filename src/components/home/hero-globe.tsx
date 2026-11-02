// Soft, render-style illustration: a globe carrying a miniature circular economy.
// Pure SVG + CSS animation (respects reduced-motion via globals.css).

const C = { x: 260, y: 300, r: 168 };
// Trig results are rounded so server and browser render identical SVG attributes (no hydration drift).
const r2 = (n: number) => Math.round(n * 100) / 100;
const onRim = (deg: number, lift = 0) => {
  const t = (deg * Math.PI) / 180;
  return { x: r2(C.x + (C.r + lift) * Math.cos(t)), y: r2(C.y + (C.r + lift) * Math.sin(t)) };
};

function Factory({ deg, s = 1, tone = "#f4efe3" }: { deg: number; s?: number; tone?: string }) {
  const { x, y } = onRim(deg, -4);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="2" cy="1" rx="22" ry="4" fill="#0f261b" opacity="0.18" />
      {/* side face */}
      <path d="M6 0 L18 -6 L18 -27 L6 -21 Z" fill="#cfc6b0" />
      {/* front face */}
      <path d="M-16 0 H6 V-21 H-16 Z" fill={tone} />
      {/* sawtooth roof */}
      <path d="M-16 -21 L-12 -28 L-8 -21 L-4 -28 L0 -21 L4 -28 L6 -21 Z" fill="#e3dccb" />
      <path d="M6 -21 L18 -27 L16 -33 L4 -28 Z" fill="#bdb39b" />
      {/* windows */}
      <rect x="-13" y="-14" width="4" height="5" rx="1" fill="#57a773" opacity="0.8" />
      <rect x="-6" y="-14" width="4" height="5" rx="1" fill="#57a773" opacity="0.8" />
      <rect x="1" y="-8" width="4" height="8" rx="1" fill="#1e4d36" opacity="0.7" />
      {/* chimney + leafy "clean" plume */}
      <rect x="-14" y="-40" width="5" height="19" fill="#d9d1bd" />
      <rect x="-14" y="-41" width="5" height="2.5" fill="#a8834a" />
      <circle cx="-11" cy="-48" r="4.5" fill="#c3dfc9" opacity="0.9" />
      <circle cx="-6" cy="-54" r="3.5" fill="#e9f2ea" opacity="0.9" />
      <circle cx="-1" cy="-58" r="2.5" fill="#ffffff" opacity="0.8" />
    </g>
  );
}

function Tree({ deg, s = 1 }: { deg: number; s?: number }) {
  const { x, y } = onRim(deg, -3);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="1" rx="8" ry="2" fill="#0f261b" opacity="0.18" />
      <rect x="-1.5" y="-12" width="3" height="12" rx="1" fill="#8a6438" />
      <circle cx="0" cy="-18" r="9" fill="url(#hg-tree)" />
      <circle cx="-3" cy="-21" r="3" fill="#ffffff" opacity="0.25" />
    </g>
  );
}

function Turbine({ deg, s = 1 }: { deg: number; s?: number }) {
  const { x, y } = onRim(deg, -3);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-1.2 0 L-0.6 -46 H0.6 L1.2 0 Z" fill="#f6f4ec" />
      <g transform="translate(0 -46)">
        <g className="animate-[spin_9s_linear_infinite]" style={{ transformOrigin: "0 0" }}>
          <path d="M0 0 L-2 -22 L1 -22 Z" fill="#ffffff" />
          <path d="M0 0 L-2 -22 L1 -22 Z" fill="#ffffff" transform="rotate(120)" />
          <path d="M0 0 L-2 -22 L1 -22 Z" fill="#ffffff" transform="rotate(240)" />
        </g>
        <circle r="2" fill="#e3dccb" />
      </g>
    </g>
  );
}

export function HeroGlobe({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 540" className={className} role="img" aria-label="Illustration: a globe with miniature factories, trees and a circular recycling loop">
      <defs>
        <radialGradient id="hg-sphere" cx="38%" cy="30%" r="78%">
          <stop offset="0" stopColor="#e9f2ea" />
          <stop offset="0.28" stopColor="#9fcaa9" />
          <stop offset="0.62" stopColor="#3f8a5f" />
          <stop offset="1" stopColor="#0f261b" />
        </radialGradient>
        <radialGradient id="hg-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0.78" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.9" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hg-shine" cx="32%" cy="22%" r="40%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hg-tree" cx="35%" cy="30%" r="70%">
          <stop offset="0" stopColor="#9fd0a8" />
          <stop offset="1" stopColor="#2f7a52" />
        </radialGradient>
        <linearGradient id="hg-log" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#d9b07a" />
          <stop offset="1" stopColor="#8a6438" />
        </linearGradient>
        <linearGradient id="hg-bottle" x1="0" x2="1">
          <stop offset="0" stopColor="#cfe6ee" />
          <stop offset="0.5" stopColor="#ffffff" />
          <stop offset="1" stopColor="#8fb9c9" />
        </linearGradient>
        <linearGradient id="hg-orbit" x1="0" x2="1">
          <stop offset="0" stopColor="#a8834a" stopOpacity="0.1" />
          <stop offset="0.5" stopColor="#a8834a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#a8834a" stopOpacity="0.1" />
        </linearGradient>
        <clipPath id="hg-clip"><circle cx={C.x} cy={C.y} r={C.r} /></clipPath>
        <filter id="hg-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10" /></filter>
      </defs>

      {/* ground shadow */}
      <ellipse cx={C.x} cy={C.y + C.r + 26} rx="150" ry="16" fill="#0f261b" opacity="0.22" filter="url(#hg-soft)" />

      {/* orbit, back half */}
      <ellipse cx={C.x} cy={C.y + 10} rx="236" ry="62" fill="none" stroke="url(#hg-orbit)" strokeWidth="1.5" strokeDasharray="2 7" transform={`rotate(-14 ${C.x} ${C.y})`} />

      {/* sphere */}
      <circle cx={C.x} cy={C.y} r={C.r + 14} fill="url(#hg-halo)" />
      <circle cx={C.x} cy={C.y} r={C.r} fill="url(#hg-sphere)" />
      <g clipPath="url(#hg-clip)" opacity="0.9">
        <path d="M120 250 C 150 210, 210 215, 230 245 C 250 275, 215 300, 240 330 C 262 356, 230 392, 196 384 C 160 376, 168 340, 140 322 C 112 304, 100 282, 120 250 Z" fill="#c3dfc9" opacity="0.55" />
        <path d="M290 200 C 330 186, 385 205, 400 240 C 412 270, 380 280, 372 306 C 362 340, 330 350, 312 330 C 296 312, 316 286, 296 266 C 276 246, 262 212, 290 200 Z" fill="#c3dfc9" opacity="0.5" />
        <path d="M300 380 C 330 368, 372 376, 380 400 C 388 424, 352 446, 322 436 C 296 428, 280 396, 300 380 Z" fill="#c3dfc9" opacity="0.4" />
        {[-60, -30, 0, 30, 60].map((lat) => (
          <ellipse key={lat} cx={C.x} cy={C.y + (lat / 90) * C.r} rx={r2(C.r * Math.cos((lat * Math.PI) / 180))} ry={10} fill="none" stroke="#ffffff" strokeOpacity="0.12" />
        ))}
        <ellipse cx={C.x} cy={C.y} rx="60" ry={C.r} fill="none" stroke="#ffffff" strokeOpacity="0.1" />
      </g>
      <circle cx={C.x} cy={C.y} r={C.r} fill="url(#hg-shine)" />

      {/* miniature ecosystem on the crown */}
      <Tree deg={-160} s={0.9} />
      <Factory deg={-142} s={0.95} />
      <Tree deg={-126} s={1.1} />
      <Turbine deg={-112} s={1} />
      <Factory deg={-96} s={1.15} tone="#f8f4ea" />
      <Tree deg={-82} s={1} />
      <Turbine deg={-70} s={0.9} />
      <Factory deg={-55} s={1} />
      <Tree deg={-40} s={1.15} />
      <Tree deg={-24} s={0.85} />

      {/* orbit, front half with recycling arrows */}
      <g transform={`rotate(-14 ${C.x} ${C.y})`}>
        <path d={`M ${C.x - 236} ${C.y + 10} A 236 62 0 0 0 ${C.x + 236} ${C.y + 10}`} fill="none" stroke="#a8834a" strokeOpacity="0.85" strokeWidth="2.2" strokeDasharray="10 14" className="animate-[orbit-flow_6s_linear_infinite]" />
        {[0.18, 0.5, 0.82].map((t) => {
          const a = Math.PI * (1 - t);
          const x = r2(C.x + 236 * Math.cos(a));
          const y = r2(C.y + 10 + 62 * Math.sin(a));
          const angle = r2((Math.atan2(62 * Math.cos(a), -236 * Math.sin(a)) * 180) / Math.PI + 180);
          return (
            <g key={t} transform={`translate(${x} ${y}) rotate(${angle})`}>
              <circle r="11" fill="#ffffff" stroke="#e3dccb" />
              <path d="M-4 -4 L3 0 L-4 4" fill="none" stroke="#1e4d36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        })}
      </g>

      {/* floating recovered materials */}
      <g className="animate-float" style={{ animationDelay: "-1s" }}>
        <g transform="translate(58 150) rotate(-18)">
          <ellipse cx="0" cy="34" rx="22" ry="4" fill="#0f261b" opacity="0.1" />
          <rect x="-26" y="-9" width="52" height="18" rx="9" fill="url(#hg-log)" />
          <ellipse cx="26" cy="0" rx="6" ry="9" fill="#e8c999" />
          <ellipse cx="26" cy="0" rx="3" ry="5" fill="none" stroke="#a5783f" />
        </g>
      </g>
      <g className="animate-float" style={{ animationDelay: "-3.5s" }}>
        <g transform="translate(454 140) rotate(12)">
          <rect x="-9" y="-22" width="18" height="40" rx="7" fill="url(#hg-bottle)" stroke="#9fc3d1" />
          <rect x="-5" y="-30" width="10" height="9" rx="2" fill="#57a773" />
          <rect x="-9" y="-4" width="18" height="9" fill="#ffffff" opacity="0.7" />
        </g>
      </g>
      <g className="animate-float" style={{ animationDelay: "-5s" }}>
        <g transform="translate(470 330) rotate(-8)">
          <path d="M-20 -8 L0 -18 L20 -8 L0 2 Z" fill="#e2cfa8" />
          <path d="M-20 -8 V12 L0 22 V2 Z" fill="#c9ad7b" />
          <path d="M20 -8 V12 L0 22 V2 Z" fill="#b39462" />
          <path d="M-10 -13 L10 -3" stroke="#f4e6c8" strokeWidth="3" />
        </g>
      </g>
      <g className="animate-float" style={{ animationDelay: "-2.2s" }}>
        <g transform="translate(46 360) rotate(10)">
          <circle r="16" fill="#b8a3cc" />
          <circle r="16" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="3 4" />
          <circle r="5" fill="#7d6694" />
          <path d="M14 6 C 26 10, 30 22, 22 30" fill="none" stroke="#b8a3cc" strokeWidth="6" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}
