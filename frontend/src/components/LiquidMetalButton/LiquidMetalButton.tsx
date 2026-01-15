import React, { useRef } from 'react';
import { Link } from 'react-router-dom';

interface LiquidMetalButtonProps {
  children: React.ReactNode;
  to?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
}

const LiquidMetalButton: React.FC<LiquidMetalButtonProps> = ({
  children,
  to,
  href,
  onClick,
  className = '',
  size = 'md',
  variant = 'primary',
  disabled = false,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const handleMouseEnter = () => {
    const el = overlayRef.current;
    if (!el) return;
    el.style.transition = 'none';
    el.style.left = '-50%';
    void el.offsetWidth; // Force reflow
    el.style.transition = 'left 0.6s ease-out';
    el.style.left = '100%';
  };

  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';

  const buttonContent = (
    <>
      {/* Metallic base gradient */}
      <div 
        className="absolute inset-0 rounded-xl transition-all duration-300"
        style={{
          background: isPrimary 
            ? 'linear-gradient(135deg, #b34700 0%, #e65c00 30%, #ff751a 50%, #e65c00 70%, #b34700 100%)'
            : isOutline
              ? 'transparent'
              : 'linear-gradient(135deg, rgba(46, 41, 36, 0.8) 0%, rgba(26, 24, 22, 0.9) 100%)',
          backgroundSize: '200% 200%',
          border: isOutline ? '1px solid rgba(230, 92, 0, 0.5)' : 'none',
        }}
      />
      
      {/* Outline hover fill */}
      {isOutline && (
        <div 
          className="absolute inset-0 rounded-xl transition-all duration-300 opacity-0 group-hover:opacity-100"
          style={{
            background: 'linear-gradient(135deg, rgba(230, 92, 0, 0.1) 0%, rgba(230, 92, 0, 0.05) 100%)',
          }}
        />
      )}
      
      {/* Inner highlight - top edge reflection */}
      {!isOutline && (
        <div 
          className="absolute inset-x-0 top-0 h-1/2 rounded-t-xl pointer-events-none"
          style={{
            background: isPrimary
              ? 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 50%, transparent 100%)'
              : 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)',
          }}
        />
      )}
      
      {/* Bottom shadow for depth */}
      {!isOutline && (
        <div 
          className="absolute inset-x-0 bottom-0 h-1/3 rounded-b-xl pointer-events-none"
          style={{
            background: 'linear-gradient(0deg, rgba(0,0,0,0.2) 0%, transparent 100%)',
          }}
        />
      )}
      
      {/* Animated shine sweep */}
      <div
        ref={overlayRef}
        className="absolute inset-y-0 w-1/2 pointer-events-none"
        style={{
          left: '-50%',
          background: isOutline 
            ? 'linear-gradient(90deg, transparent 0%, rgba(230, 92, 0, 0.3) 50%, transparent 100%)'
            : 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
          transform: 'skewX(-20deg)',
        }}
      />
      
      {/* Border glow */}
      <div 
        className="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        style={{
          boxShadow: isPrimary 
            ? 'inset 0 0 0 1px rgba(255,255,255,0.2)'
            : isOutline
              ? 'inset 0 0 0 1px rgba(230, 92, 0, 0.8)'
              : 'inset 0 0 0 1px rgba(230, 92, 0, 0.3)',
        }}
      />
      
      {/* Content */}
      <span 
        className="relative z-10 font-semibold flex items-center gap-2 transition-colors duration-300"
        style={{ 
          color: isPrimary ? '#0a0908' : isOutline ? '#e65c00' : '#f5f2ef',
          textShadow: isPrimary ? '0 1px 0 rgba(255,255,255,0.2)' : 'none',
        }}
      >
        {children}
      </span>
    </>
  );

  const baseClasses = `
    group relative inline-flex items-center justify-center overflow-hidden rounded-xl
    ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-[1.03] active:scale-[0.98]'}
    transition-all duration-300 ease-out
    ${sizeClasses[size]} ${className}
  `.trim().replace(/\s+/g, ' ');

  const hoverShadow = isPrimary 
    ? '0 0 30px rgba(230, 92, 0, 0.5), 0 10px 40px rgba(230, 92, 0, 0.3)'
    : isOutline
      ? '0 0 20px rgba(230, 92, 0, 0.3)'
      : '0 0 20px rgba(230, 92, 0, 0.2)';

  const style: React.CSSProperties = {
    boxShadow: isPrimary 
      ? '0 4px 15px rgba(230, 92, 0, 0.3), 0 2px 4px rgba(0,0,0,0.2)'
      : isOutline
        ? 'none'
        : '0 2px 10px rgba(0,0,0,0.3)',
  };

  const hoverStyle = {
    boxShadow: hoverShadow,
  };

  if (to) {
    return (
      <Link 
        to={to} 
        className={baseClasses} 
        style={style}
        onMouseEnter={(e) => {
          handleMouseEnter();
          Object.assign(e.currentTarget.style, hoverStyle);
        }}
        onMouseLeave={(e) => {
          Object.assign(e.currentTarget.style, style);
        }}
      >
        {buttonContent}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={baseClasses}
        style={style}
        onMouseEnter={(e) => {
          handleMouseEnter();
          Object.assign(e.currentTarget.style, hoverStyle);
        }}
        onMouseLeave={(e) => {
          Object.assign(e.currentTarget.style, style);
        }}
      >
        {buttonContent}
      </a>
    );
  }

  return (
    <button 
      className={baseClasses} 
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={style}
      onMouseEnter={(e) => {
        if (!disabled) {
          handleMouseEnter();
          Object.assign(e.currentTarget.style, hoverStyle);
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          Object.assign(e.currentTarget.style, style);
        }
      }}
    >
      {buttonContent}
    </button>
  );
};

export default LiquidMetalButton;

