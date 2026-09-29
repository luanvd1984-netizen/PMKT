"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { ReactNode } from "react";

export function Button({
  children,
  variant = "default",
  size = "default",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  size?: "default" | "sm" | "icon";
}) {
  const variants = {
    default: "bg-zinc-900 text-white hover:bg-zinc-800",
    outline: "border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900",
    ghost: "hover:bg-zinc-100 text-zinc-700",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
  };
  const sizes = {
    default: "h-9 px-4 py-2 text-sm",
    sm: "h-8 px-3 text-xs",
    icon: "h-8 w-8",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: "default" | "success" | "muted" | "warning";
  className?: string;
}) {
  const variants = {
    default: "bg-zinc-900 text-white",
    success: "bg-zinc-900 text-white",
    muted: "bg-zinc-100 text-zinc-500",
    warning: "bg-amber-100 text-amber-800",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Label({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("text-sm font-medium text-zinc-700", className)}>
      {children}
    </label>
  );
}
