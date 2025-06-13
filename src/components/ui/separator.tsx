import * as React from 'react';
import type { HTMLAttributes } from 'react';

export interface SeparatorProps extends HTMLAttributes<HTMLHRElement> {}

export const Separator = React.forwardRef<HTMLHRElement, SeparatorProps>(
  ({ className = '', ...props }, ref) => (
    <hr
      ref={ref}
      className={
        'border-t border-gray-200 my-2 ' + className
      }
      {...props}
    />
  )
);
Separator.displayName = 'Separator';

export default Separator;
