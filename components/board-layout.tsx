import React from "react";

interface BoardLayoutProps {
  children: React.ReactNode;
  isPublicView?: boolean;
}

export function BoardLayout({ children, isPublicView = false }: BoardLayoutProps) {
  if (isPublicView) {
    return (
      <div className="min-h-screen max-w-screen bg-background dark:bg-zinc-950 bg-dots">
        {children}
      </div>
    );
  }

  // Private board layout with dotted background
  return (
    <div className="min-h-screen max-w-screen bg-zinc-100 dark:bg-zinc-800 bg-dots">{children}</div>
  );
}
