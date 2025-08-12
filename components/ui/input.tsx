import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        
        // original sizing/structure
        "flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm",
        
        // file input visuals
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",

        // selection + placeholder
        "selection:bg-primary selection:text-primary-foreground",
        "placeholder:text-muted-foreground dark:placeholder:text-zinc-400",
        
        // COLORS (updated only)
        "bg-background dark:bg-zinc-900",
        "text-foreground dark:text-zinc-100",
        "border-gray-200 dark:border-zinc-800",
        "focus-visible:border-blue-500 dark:focus-visible:border-zinc-600",
        "focus-visible:ring-blue-500 dark:focus-visible:ring-zinc-600 focus-visible:ring-1",
        
        // invalid state stays the same tokens
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  );
}

export { Input };
