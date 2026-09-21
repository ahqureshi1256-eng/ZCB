import React from 'react';

interface ZcbLogoProps {
  className?: string;
  size?: number | string;
  imageUrl?: string;
}

export const ZcbLogo: React.FC<ZcbLogoProps> = ({
  className = 'w-12 h-12',
  imageUrl,
}) => {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="ZCB - Zaiqa Chicken Biryani"
        className={`rounded-full object-cover shadow-md ${className}`}
      />
    );
  }

  // Exact 1:1 replica of the official ZCB Yellow Circular Badge with A.R Foods Zaiqa emblem & ZCB serif font
  return (
    <svg
      viewBox="0 0 300 300"
      className={`rounded-full shadow-md select-none flex-shrink-0 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Bright Yellow Circular Badge */}
      <circle cx="150" cy="150" r="146" fill="#FED800" stroke="#000000" strokeWidth="12" />

      {/* Inner Top Circular Emblem (A.R FOODS ZAIQA) */}
      <circle cx="150" cy="80" r="42" fill="#FED800" stroke="#000000" strokeWidth="5" />
      
      {/* "A.R FOODS" along top curve of inner emblem */}
      <path id="arFoodsArcComp" d="M 116,80 A 34,34 0 0,1 184,80" fill="none" />
      <text fill="#000000" fontFamily="'Arial Black', Impact, sans-serif" fontSize="10" fontWeight="900" letterSpacing="1.5">
        <textPath href="#arFoodsArcComp" startOffset="50%" textAnchor="middle">
          A.R FOODS
        </textPath>
      </text>

      {/* Chef Caricature in Inner Emblem */}
      <g transform="translate(133, 58) scale(0.85)">
        {/* Chef Toque Hat */}
        <path d="M 9,18 C 5,14 4,6 12,5 C 16,3 24,3 28,5 C 36,6 35,14 31,18 Z" fill="#FFFFFF" stroke="#000000" strokeWidth="2.5" />
        <path d="M 13,18 L 27,18" stroke="#000000" strokeWidth="2.5" />
        <path d="M 15,10 C 17,7 23,7 25,10" fill="none" stroke="#000000" strokeWidth="1.8" />
        {/* Chef Face */}
        <ellipse cx="20" cy="24" rx="7.5" ry="6.5" fill="#FFE0B2" stroke="#000000" strokeWidth="2.2" />
        {/* Moustache */}
        <path d="M 15,26 C 18,24 20,27 20,27 C 20,27 22,24 25,26" fill="#000000" />
        {/* Eyes winking / smiling */}
        <circle cx="17" cy="22" r="1.2" fill="#000000" />
        <path d="M 22,22 Q 24,21 25,22" fill="none" stroke="#000000" strokeWidth="1.2" />
        {/* Hand with OK Sign */}
        <circle cx="31" cy="24" r="3.2" fill="#FFE0B2" stroke="#000000" strokeWidth="1.8" />
        <path d="M 33,21 L 34,17 M 35,22 L 37,19 M 35,25 L 38,24" stroke="#000000" strokeWidth="1.6" strokeLinecap="round" />
      </g>

      {/* "ZAIQA" text in inner emblem below chef */}
      <text x="150" y="112" textAnchor="middle" fill="#000000" fontFamily="'Arial Black', sans-serif" fontSize="10.5" fontWeight="900" letterSpacing="1.2">
        ZAIQA
      </text>

      {/* Huge Bold Serif "Z C B" */}
      <text x="150" y="196" textAnchor="middle" fill="#000000" fontFamily="'Times New Roman', Georgia, Garamond, serif" fontSize="86" fontWeight="900" letterSpacing="1">
        ZCB
      </text>

      {/* "Zaiqa Chicken Biryani" along bottom curve of yellow circle */}
      <path id="zaiqaBottomArcComp" d="M 44,188 A 118,118 0 0,0 256,188" fill="none" />
      <text fill="#000000" fontFamily="system-ui, -apple-system, sans-serif" fontSize="19" fontWeight="900" letterSpacing="0.8">
        <textPath href="#zaiqaBottomArcComp" startOffset="50%" textAnchor="middle">
          Zaiqa Chicken Biryani
        </textPath>
      </text>
    </svg>
  );
};
