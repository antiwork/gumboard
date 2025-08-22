"use client";

import * as React from "react";
import { parseLinks } from "@/lib/link-parser";
import { cn } from "@/lib/utils";

interface LinkifiedTextProps {
  text: string;
  className?: string;
  linkClassName?: string;
}

export function LinkifiedText({
  text,
  className,
  linkClassName,
}: LinkifiedTextProps) {
  // Only memoize the parsing operation since it involves regex
  const parts = React.useMemo(() => parseLinks(text), [text]);

  // Early return for no links case
  if (parts.length === 1 && parts[0].type === 'text') {
    return (
      <span 
        className={className}
        dangerouslySetInnerHTML={{ __html: parts[0].content }}
      />
    );
  }

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return (
            <span
              key={`text-${index}`}
              dangerouslySetInnerHTML={{ __html: part.content }}
            />
          );
        }

        if (part.type === "link" && part.url) {
          return (
            <a
              key={`link-${index}`}
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline decoration-blue-600/30 hover:decoration-blue-600 transition-colors break-all",
                linkClassName
              )}
              onClick={(e) => e.stopPropagation()}
              title={part.url}
            >
              <span dangerouslySetInnerHTML={{ __html: part.content }} />
            </a>
          );
        }

        return null;
      })}
    </span>
  );
}
