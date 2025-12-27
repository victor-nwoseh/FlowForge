import React from 'react';

type StarBorderProps<T extends React.ElementType> = React.ComponentPropsWithoutRef<T> & {
  as?: T;
  className?: string;
  children?: React.ReactNode;
  color?: string;
  speed?: React.CSSProperties['animationDuration'];
  thickness?: number;
};

const StarBorder = <T extends React.ElementType = 'div'>({
  as,
  className = '',
  color = 'white',
  speed = '6s',
  thickness = 2,
  children,
  ...rest
}: StarBorderProps<T>) => {
  const Component = as || 'div';

  return (
    <Component
      className={`relative inline-block rounded-[20px] ${className}`}
      {...(rest as React.ComponentPropsWithoutRef<T>)}
      style={{
        padding: `${thickness}px`,
        background: `linear-gradient(135deg, rgba(46, 41, 36, 0.6) 0%, rgba(26, 24, 22, 0.8) 100%)`,
        ...(rest as { style?: React.CSSProperties }).style
      }}
    >
      {/* Overflow container for star animations */}
      <div className="absolute inset-0 rounded-[20px] overflow-hidden pointer-events-none">
        {/* Star moving along bottom edge - from right to left */}
        <div
          className="absolute rounded-full"
          style={{
            width: '150px',
            height: '80px',
            bottom: '-35px',
            right: '-150px',
            background: `radial-gradient(ellipse at center, ${color} 0%, ${color}cc 20%, ${color}66 40%, transparent 70%)`,
            animation: `star-movement-bottom ${speed} linear infinite alternate`,
            filter: 'blur(8px)',
          }}
        ></div>
        {/* Star moving along top edge - from left to right */}
        <div
          className="absolute rounded-full"
          style={{
            width: '150px',
            height: '80px',
            top: '-35px',
            left: '-150px',
            background: `radial-gradient(ellipse at center, ${color} 0%, ${color}cc 20%, ${color}66 40%, transparent 70%)`,
            animation: `star-movement-top ${speed} linear infinite alternate`,
            filter: 'blur(8px)',
          }}
        ></div>
      </div>
      {/* Inner content */}
      <div className="relative z-[1] h-full rounded-[18px] overflow-hidden">
        {children}
      </div>
    </Component>
  );
};

export default StarBorder;

