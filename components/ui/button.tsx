import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-none text-sm font-medium tracking-wide ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 gallery-line-button px-0 py-2 h-auto min-h-[2.75rem]',
  {
    variants: {
      variant: {
        default: 'bg-transparent text-black border-b border-black hover:opacity-70',
        destructive: 'bg-transparent text-black border-b border-black hover:opacity-70',
        outline: 'bg-transparent text-black border-b border-black hover:opacity-70',
        secondary: 'bg-transparent text-black border-b border-black hover:opacity-70',
        ghost: 'border-b border-transparent hover:border-black',
        link: 'text-black border-b border-black underline-offset-4 hover:opacity-70',
      },
      size: {
        default: 'px-0 py-2',
        sm: 'px-0 py-1.5 text-xs min-h-0',
        lg: 'px-0 py-3 text-base',
        icon: 'h-10 w-10 min-h-0 border-b-0 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
