import * as React from 'react';
import type { ButtonHTMLAttributes, ForwardedRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg';
}

const base =
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background';

const variants = {
  default: 'bg-blue-600 text-white hover:bg-blue-700',
  outline: 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-100',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-900',
  link: 'bg-transparent underline-offset-4 hover:underline text-blue-600',
};

const sizes = {
  default: 'h-10 px-4 py-2',
  sm: 'h-8 px-3',
  lg: 'h-12 px-6',
};

export const Button = React.forwardRef(
  (
    { className = '', variant = 'default', size = 'default', ...props }: ButtonProps,
    ref: ForwardedRef<HTMLButtonElement>
  ) => (
    <button
      ref={ref}
      className={[
        base,
        variants[variant],
        sizes[size],
        className,
      ].join(' ')}
      {...props}
    />
  )
);
Button.displayName = 'Button';

export default Button;
