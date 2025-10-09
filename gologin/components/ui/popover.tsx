import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

type PopoverProps = React.ComponentProps<typeof PopoverPrimitive.Root>;

export const Popover = (props: PopoverProps) => {
  return <PopoverPrimitive.Root {...props} />;
};

export const PopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentProps<typeof PopoverPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <PopoverPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
      className
    )}
    {...props}
  />
));
PopoverTrigger.displayName = "PopoverTrigger";

export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentProps<typeof PopoverPrimitive.Content> & { inset?: boolean }
>(({ className, align = "center", sideOffset = 8, inset = false, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-auto max-w-sm rounded-lg border bg-white p-3 text-sm shadow-md animate-in data-[state=open]:fade-in data-[state=open]:zoom-in",
        inset ? "-translate-y-1/2" : "",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = "PopoverContent";

export const PopoverClose = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Close>,
  React.ComponentProps<typeof PopoverPrimitive.Close>
>(({ className, ...props }, ref) => (
  <PopoverPrimitive.Close
    ref={ref}
    className={cn("absolute top-2 right-2 rounded-md p-1 text-sm", className)}
    {...props}
  />
));
PopoverClose.displayName = "PopoverClose";

// Default export (wrapper) to follow the project's single-default-export convention
export default Popover;

/*
Usage example:

import Popover, { PopoverTrigger, PopoverContent, PopoverClose } from "@/components/ui/popover";

<Popover>
  <PopoverTrigger asChild>
    <button>Open</button>
  </PopoverTrigger>

  <PopoverContent>
    <div className="space-y-2">
      <p className="text-sm">This is a popover.</p>
      <PopoverClose asChild>
        <button className="text-xs">Close</button>
      </PopoverClose>
    </div>
  </PopoverContent>
</Popover>

Notes:
- This component uses @radix-ui/react-popover and a `cn` utility (className merge). If you don't have `cn`, replace with a simple join: (\n  className ? `${base} ${className}` : base\n)
- Tailwind classes are used for styling; adjust to match your design system (dark mode, variants, animations).
*/
