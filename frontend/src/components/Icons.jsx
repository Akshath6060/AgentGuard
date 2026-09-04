const base = {
  fill: 'none',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
}

export const Shield = ({ size = 17, stroke = 'currentColor', width = 2, ...rest }) => (
  <svg {...base} width={size} height={size} stroke={stroke} strokeWidth={width} {...rest}>
    <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)

export const ShieldAlert = ({ size = 17, stroke = 'currentColor', width = 1.7 }) => (
  <svg {...base} width={size} height={size} stroke={stroke} strokeWidth={width}>
    <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" />
    <path d="M12 8.5v3.6" />
    <path d="M12 15.4v.1" />
  </svg>
)

export const Check = ({ size = 17, stroke = 'currentColor', width = 2 }) => (
  <svg {...base} width={size} height={size} stroke={stroke} strokeWidth={width}>
    <path d="M4 12.5l5 5L20 6.5" />
  </svg>
)

export const CheckBold = ({ size = 10 }) => (
  <svg {...base} width={size} height={size} stroke="#fff" strokeWidth="3.4">
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
)

export const Grid = ({ size = 17 }) => (
  <svg {...base} width={size} height={size} stroke="currentColor" strokeWidth="1.7">
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
)

export const Robot = ({ size = 17 }) => (
  <svg {...base} width={size} height={size} stroke="currentColor" strokeWidth="1.7">
    <rect x="4" y="8" width="16" height="12" rx="3" />
    <path d="M12 4.5v3.5" />
    <circle cx="9.2" cy="14" r="1" />
    <circle cx="14.8" cy="14" r="1" />
  </svg>
)

export const Users = ({ size = 17 }) => (
  <svg {...base} width={size} height={size} stroke="currentColor" strokeWidth="1.7">
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19v-1.5A4.5 4.5 0 018 13h2a4.5 4.5 0 014.5 4.5V19" />
    <path d="M15 5.5a3 3 0 010 5.8M17 14a4 4 0 013.5 4v1" />
  </svg>
)

export const Card = ({ size = 17 }) => (
  <svg {...base} width={size} height={size} stroke="currentColor" strokeWidth="1.7">
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <path d="M2.5 10h19" />
  </svg>
)

export const CircleCheck = ({ size = 17 }) => (
  <svg {...base} width={size} height={size} stroke="currentColor" strokeWidth="1.7">
    <circle cx="12" cy="12" r="9" />
    <path d="M8.3 12.3l2.5 2.5 4.9-5.4" />
  </svg>
)

export const Doc = ({ size = 17 }) => (
  <svg {...base} width={size} height={size} stroke="currentColor" strokeWidth="1.7">
    <rect x="4.5" y="3" width="15" height="18" rx="2.5" />
    <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
  </svg>
)

export const Code = ({ size = 17 }) => (
  <svg {...base} width={size} height={size} stroke="currentColor" strokeWidth="1.7">
    <path d="M8.5 7.5L3.5 12l5 4.5M15.5 7.5l5 4.5-5 4.5" />
  </svg>
)

export const Gear = ({ size = 17 }) => (
  <svg {...base} width={size} height={size} stroke="currentColor" strokeWidth="1.7">
    <circle cx="12" cy="12" r="3.4" />
    <path d="M12 2.6v2.4M12 19v2.4M2.6 12H5M19 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M18.7 5.3L17 7M7 17l-1.7 1.7" />
  </svg>
)

export const Bell = ({ size = 17 }) => (
  <svg {...base} width={size} height={size} stroke="#4B5563" strokeWidth="1.7">
    <path d="M18 15V10a6 6 0 10-12 0v5l-1.5 2.5h15z" />
    <path d="M10 19.5a2 2 0 004 0" />
  </svg>
)

export const Menu = ({ size = 19 }) => (
  <svg {...base} width={size} height={size} stroke="currentColor" strokeWidth="1.8">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
)

export const Search = ({ size = 15 }) => (
  <svg {...base} width={size} height={size} stroke="#9CA3AF" strokeWidth="1.8">
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </svg>
)

export const ChevronDown = ({ size = 15, stroke = '#9CA3AF', style }) => (
  <svg {...base} width={size} height={size} stroke={stroke} strokeWidth="1.8" style={style}>
    <path d="M8 10l4 4 4-4" />
  </svg>
)

export const ArrowRight = ({ size = 15, stroke = '#9CA3AF' }) => (
  <svg {...base} width={size} height={size} stroke={stroke} strokeWidth="1.8">
    <path d="M5 12h13M13 7l5 5-5 5" />
  </svg>
)

export const Cross = ({ size = 15, stroke = '#9CA3AF', width = 2.2 }) => (
  <svg {...base} width={size} height={size} stroke={stroke} strokeWidth={width}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

export const DocEmpty = ({ size = 20 }) => (
  <svg {...base} width={size} height={size} stroke="#9CA3AF" strokeWidth="1.7">
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M8 10h8M8 14h5" />
  </svg>
)

export const Logo = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="AgentGuard logo" style={{ flex: 'none' }}>
    <defs>
      <linearGradient id="agentguard-mark" x1="5" y1="3" x2="35" y2="37" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" />
        <stop offset="1" stopColor="#312E81" />
      </linearGradient>
    </defs>
    <rect width="40" height="40" rx="11" fill="url(#agentguard-mark)" />
    <path d="M20 8.3 30 12v7.6c0 6.1-4.1 10.2-10 12.8-5.9-2.6-10-6.7-10-12.8V12l10-3.7Z" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
    <path d="m15.2 20.1 3.1 3.1 6.6-7" fill="none" stroke="#A5F3FC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="29.7" cy="10.4" r="2.2" fill="#67E8F9" />
  </svg>
)

export const Razorpay = ({ size = 26, radius = 6, font = 12 }) => (
  <span
    style={{
      width: size, height: size, borderRadius: radius, background: '#0C2451', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: font, fontWeight: 700, flex: 'none',
    }}
  >
    R
  </span>
)
