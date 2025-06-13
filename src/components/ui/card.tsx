import * as React from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={
        'bg-white rounded-xl shadow border border-gray-200 ' + className
      }
      {...props}
    />
  )
);
Card.displayName = 'Card';

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}
export const CardHeader: React.FC<CardHeaderProps> = ({ className = '', ...props }) => (
  <div className={'px-6 pt-6 pb-2 ' + className} {...props} />
);

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}
export const CardTitle: React.FC<CardTitleProps> = ({ className = '', ...props }) => (
  <h2 className={'text-lg font-bold ' + className} {...props} />
);

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}
export const CardContent: React.FC<CardContentProps> = ({ className = '', ...props }) => (
  <div className={'px-6 pb-6 ' + className} {...props} />
);

export default Card;
