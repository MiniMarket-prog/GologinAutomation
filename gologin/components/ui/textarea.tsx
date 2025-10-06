import React, { forwardRef, TextareaHTMLAttributes } from "react";

// Props extend standard HTML textarea attributes
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col w-full">
        {label && <label className="mb-1 text-sm font-medium">{label}</label>}
        <textarea
          ref={ref}
          className={`border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
          {...props}
        />
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
