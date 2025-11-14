import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: React.ComponentType<{ size?: number }>;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-400',
  secondary:
    'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400 disabled:bg-gray-200',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-400',
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

