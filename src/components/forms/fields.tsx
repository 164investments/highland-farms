import type {
  InputHTMLAttributes,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

/*
 * Field Guide form primitives (paper system, 2026-10-06): labels above
 * fields, 1px rule borders, square corners, 48px controls, a pine focus
 * ring. Errors use one brick red, 7.9:1 on paper-light, in text and border.
 */

export const fieldErrorText = "text-[#8A2A1C]";
const fieldErrorBorder = "border-[#8A2A1C]";

const controlBase =
  "block w-full rounded-none border bg-paper-light px-3.5 font-sans text-[16px] text-ink transition-colors placeholder:text-ink-meta hover:border-frame focus:border-pine focus:outline-2 focus:outline-offset-0 focus:outline-pine";

export function controlClass(invalid?: boolean, extra?: string) {
  return cn(controlBase, invalid ? fieldErrorBorder : "border-rule", extra);
}

/** "a b" from the ids that exist; undefined when none do. */
export function describedBy(...ids: (string | false | null | undefined)[]) {
  const list = ids.filter(Boolean).join(" ");
  return list || undefined;
}

export function FieldLabel({
  htmlFor,
  children,
  required,
  optional,
  className,
}: {
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
  optional?: boolean;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("mb-1.5 block font-sans text-[14px] font-medium leading-snug text-ink", className)}
    >
      {children}
      {required && (
        <span aria-hidden="true" className="text-ink-note">
          *
        </span>
      )}
      {optional && <span className="font-normal text-ink-meta"> (optional)</span>}
    </label>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} aria-live="polite" className={cn("mt-1.5 font-sans text-[13px] leading-snug", fieldErrorText)}>
      {message}
    </p>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
};

export function TextInput({ invalid, className, ref, ...props }: InputProps) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={controlClass(invalid, cn("h-12", className))}
      {...props}
    />
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
};

export function TextArea({ invalid, className, ref, ...props }: TextareaProps) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={controlClass(invalid, cn("min-h-[132px] resize-y py-3 leading-relaxed", className))}
      {...props}
    />
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
  ref?: Ref<HTMLSelectElement>;
  options: readonly { value: string; label: string }[];
  /** First, empty option ("Choose a range"). */
  placeholder: string;
};

export function SelectInput({ invalid, className, ref, options, placeholder, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={controlClass(invalid, cn("h-12 cursor-pointer appearance-none pr-10", className))}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-note"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 7.5l5 5 5-5" />
      </svg>
    </div>
  );
}

type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & {
  ref?: Ref<HTMLInputElement>;
  children: ReactNode;
  /** Smaller print for consent copy. */
  fine?: boolean;
  /** Centre the box on a one-line label (no top nudge). */
  centered?: boolean;
};

/** Whole row is the target (44px+), box is square and pine when checked. */
export function CheckboxRow({ id, children, fine, centered, ref, className, ...props }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn("flex min-h-[44px] cursor-pointer gap-3 py-2", centered ? "items-center" : "items-start", className)}
    >
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className={cn(
          "h-5 w-5 shrink-0 cursor-pointer rounded-none border border-rule accent-pine",
          !centered && "mt-[3px]",
        )}
        {...props}
      />
      <span
        className={cn(
          "font-sans leading-relaxed",
          fine ? "text-[13px] text-ink-note" : "text-[15px] text-ink-body",
        )}
      >
        {children}
      </span>
    </label>
  );
}

type ConsentRowProps = InputHTMLAttributes<HTMLInputElement> & {
  ref?: Ref<HTMLInputElement>;
  /** One-line label in body weight. */
  label: string;
  /** The full consent wording, shown beside the box. */
  children: ReactNode;
};

/**
 * One SMS consent: the box, a one-line label, and the complete wording under
 * the label at 12.5px (never collapsed: the wording must be visible next to
 * the box). The whole row is the target.
 */
export function ConsentRow({ id, label, children, ref, ...props }: ConsentRowProps) {
  return (
    <label htmlFor={id} className="flex min-h-[44px] cursor-pointer items-start gap-3 py-2.5">
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className="mt-[1px] h-5 w-5 shrink-0 cursor-pointer rounded-none border border-rule accent-pine"
        {...props}
      />
      <span className="min-w-0">
        <span className="block font-sans text-[15px] leading-snug text-ink">{label}</span>
        <span className="mt-1 block font-sans text-[12.5px] leading-[1.38] text-ink-note">{children}</span>
      </span>
    </label>
  );
}
