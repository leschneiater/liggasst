import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
  as?: React.ElementType;
  to?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  as: Component = 'button',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-roboto font-semibold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed border transform hover:scale-105 active:scale-95';

  const variantClasses = {
    primary: 'bg-green-deep text-white border-green-deep hover:bg-white hover:text-green-deep hover:border-green-deep focus:ring-green-deep shadow-lg hover:shadow-xl',
    secondary: 'bg-green-light text-green-deep border-green-light hover:bg-green-deep hover:text-white hover:border-green-deep focus:ring-green-light shadow-md hover:shadow-lg',
    outline: 'border-green-deep text-green-deep bg-white hover:bg-green-deep hover:text-white focus:ring-green-deep shadow-sm hover:shadow-md',
    ghost: 'text-green-deep bg-transparent border-transparent hover:bg-green-light focus:ring-green-light'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg'
  };

  const widthClass = fullWidth ? 'w-full' : '';

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`;

  return (
    <Component
      className={combinedClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon size={18} className="mr-2 flex-shrink-0" />}
          <span className="truncate">{children}</span>
          {Icon && iconPosition === 'right' && <Icon size={18} className="ml-2 flex-shrink-0" />}
        </>
      )}
    </Component>
  );
};

export default Button;