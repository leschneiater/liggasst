import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  helperText?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  icon: Icon,
  helperText,
  className = '',
  ...props
}) => {
  const inputClasses = `
    w-full px-4 py-2 border rounded-lg font-roboto
    ${Icon ? 'pl-10' : ''}
    ${error 
      ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
      : 'border-gray-300 focus:ring-green-deep focus:border-green-deep'
    }
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${className}
  `;

  return (
    <div className="space-y-1">
      {label && (
        <label className="block font-roboto font-medium text-soft-black text-sm">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon 
            size={18} 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
          />
        )}
        <input
          className={inputClasses}
          {...props}
        />
      </div>
      {error && (
        <p className="text-red-500 text-sm font-roboto">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-gray-500 text-sm font-roboto">{helperText}</p>
      )}
    </div>
  );
};

export default Input;