import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground dark:text-zinc-100 dark:placeholder:text-zinc-400 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 dark:focus-visible:ring-zinc-600 dark:focus-visible:border-zinc-600 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-zinc-900 flex min-h-16 w-full rounded-md border border-gray-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
