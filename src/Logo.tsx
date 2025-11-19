export default function Logo({ variant = 'dark' }: { variant?: 'light' | 'dark' }) {
  const color = variant === 'light' ? '#000000' : '#ffffff';
  
  return (
    <svg
      width="140"
      height="110"
      viewBox="0 0 140 110"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', margin: '0 auto 16px' }}
    >
      {/* Cloud outline - thicker, more stylized */}
      <path
        d="M25 55 Q15 55 15 45 Q15 35 25 35 Q30 20 45 20 Q60 20 65 35 Q75 35 75 45 Q75 55 65 55 Z"
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Spiral inside left portion of cloud - tighter spiral */}
      <path
        d="M32 48 Q34 46 36 48 Q34 50 32 48"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M32 48 Q30 50 28 48 Q30 46 32 48"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M32 48 Q33 47 34 48 Q33 49 32 48"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      
      {/* Two Z letters above right side of cloud - one larger, one smaller */}
      <text
        x="58"
        y="22"
        fontSize="18"
        fontWeight="bold"
        fill={color}
        fontFamily="sans-serif"
        style={{ letterSpacing: '-1px' }}
      >
        Z
      </text>
      <text
        x="62"
        y="28"
        fontSize="14"
        fontWeight="bold"
        fill={color}
        fontFamily="sans-serif"
        style={{ letterSpacing: '-1px' }}
      >
        z
      </text>
    </svg>
  );
}

