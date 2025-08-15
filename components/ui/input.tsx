import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "w-full min-w-0 h-9 rounded-md border px-3 py-1 text-base md:text-sm outline-none bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100 border-gray-200 dark:border-zinc-800 placeholder:text-muted-foreground dark:placeholder:text-zinc-400 selection:bg-primary selection:text-primary-foreground focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 dark:focus-visible:ring-zinc-600 dark:focus-visible:border-zinc-600 file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  );
}

export { Input };
