import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: React.ComponentType<{ size?: number | string }>;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-ember-500 to-ember-400 text-forge-950 font-semibold hover:from-ember-400 hover:to-ember-300 focus:ring-ember-500/50 shadow-lg shadow-ember-500/20 hover:shadow-ember-500/30 disabled:from-ember-600 disabled:to-ember-500 disabled:opacity-60',
  secondary:
    'bg-forge-800/60 text-forge-300 border border-forge-700/50 hover:bg-forge-700/60 hover:text-forge-200 focus:ring-forge-500/30 disabled:bg-forge-800/40 disabled:text-forge-500',
  danger:
    'bg-red-600/90 text-white hover:bg-red-500 focus:ring-red-500/50 disabled:bg-red-600/50',
};

const Button: React.FC<ButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  type = 'button',
  disabled,
  icon: Icon,
  ...props
}) => {
  return (
    <button
      type={type}
      className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium focus:outline-none focus:ring-2 transition disabled:cursor-not-allowed disabled:opacity-70 ${variantClasses[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
};

export default Button;

