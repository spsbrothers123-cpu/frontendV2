import { forwardRef } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  id: string;
  children: ReactNode;
}

function FieldWrapper({ label, error, hint, required, id, children }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-charcoal">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-xs text-charcoal-muted">{hint}</p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, required, id, className = "", ...props }, ref) => {
    const fieldId = id || props.name || label;
    return (
      <FieldWrapper label={label} error={error} hint={hint} required={required} id={fieldId as string}>
        <input
          ref={ref}
          id={fieldId as string}
          aria-invalid={!!error}
          className={`w-full min-h-[44px] rounded-btn border px-3.5 py-2.5 text-sm text-charcoal bg-white placeholder:text-charcoal-muted transition-colors duration-150 ${
            error ? "border-danger" : "border-charcoal/12 focus:border-yolk-500"
          } outline-none ${className}`}
          {...props}
        />
      </FieldWrapper>
    );
  }
);
Input.displayName = "Input";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { label: string; value: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, required, id, options, className = "", ...props }, ref) => {
    const fieldId = id || props.name || label;
    return (
      <FieldWrapper label={label} error={error} hint={hint} required={required} id={fieldId as string}>
        <select
          ref={ref}
          id={fieldId as string}
          aria-invalid={!!error}
          className={`w-full min-h-[44px] rounded-btn border px-3.5 py-2.5 text-sm text-charcoal bg-white transition-colors duration-150 ${
            error ? "border-danger" : "border-charcoal/12 focus:border-yolk-500"
          } outline-none ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </FieldWrapper>
    );
  }
);
Select.displayName = "Select";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, required, id, className = "", ...props }, ref) => {
    const fieldId = id || props.name || label;
    return (
      <FieldWrapper label={label} error={error} hint={hint} required={required} id={fieldId as string}>
        <textarea
          ref={ref}
          id={fieldId as string}
          aria-invalid={!!error}
          className={`w-full min-h-[88px] rounded-btn border px-3.5 py-2.5 text-sm text-charcoal bg-white placeholder:text-charcoal-muted transition-colors duration-150 ${
            error ? "border-danger" : "border-charcoal/12 focus:border-yolk-500"
          } outline-none resize-y ${className}`}
          {...props}
        />
      </FieldWrapper>
    );
  }
);
Textarea.displayName = "Textarea";
