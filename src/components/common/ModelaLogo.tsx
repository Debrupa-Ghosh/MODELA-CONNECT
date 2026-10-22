import React from 'react';

interface ModelaLogoProps {
  className?: string;
  size?: number;
  variant?: 'adaptive' | 'white';
}

export const ModelaLogo: React.FC<ModelaLogoProps> = ({
  className = 'w-8 h-8',
  size,
  variant = 'adaptive'
}) => {
  const isWhite = variant === 'white';
  const a = isWhite ? 'fill-white' : 'fill-[#38BDF8]';
  const b = isWhite ? 'fill-white/90' : 'fill-[#0284C7]';
  const c = isWhite ? 'fill-white/80' : 'fill-[#1D4ED8]';
  const style = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      className={`${className} shrink-0`}
      style={style}
      aria-label="Modela Connect Logo"
      role="img"
    >
      <polygon points="18,38 108,110 44,182 18,160" className={`${a} transition-colors duration-200`} />
      <polygon points="96,92 180,10 180,54 115,116" className={`${b} transition-colors duration-200`} />
      <polygon points="138,102 180,64 180,182 138,182" className={`${c} transition-colors duration-200`} />
    </svg>
  );
};
