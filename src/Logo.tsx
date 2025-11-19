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
        d="M50 55 Q40 55 40 45 Q40 35 50 35 Q55 20 70 20 Q85 20 90 35 Q100 35 100 45 Q100 55 90 55 Z"
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Spiral inside left portion of cloud - tighter spiral */}
      <path
        d="M57 48 Q59 46 61 48 Q59 50 57 48"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M57 48 Q55 50 53 48 Q55 46 57 48"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M57 48 Q58 47 59 48 Q58 49 57 48"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      
      {/* Two Z letters above right side of cloud - one larger, one smaller */}
      <text
        x="83"
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
        x="87"
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

