import React from "react";
import Link from "next/link";
import { BetaBadge } from "@/components/ui/beta-badge";
import { ProfileDropdown } from "@/components/profile-dropdown";
import type { User } from "@/components/note";

interface HeaderProps {
  user: User | null;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
}

export function Header({ user, leftContent, rightContent }: HeaderProps) {
  return (
    <div className="bg-card dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 shadow-sm">
      <div className="flex justify-between items-center h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-3">
          <Link href="/dashboard" className="flex-shrink-0 pl-4 sm:pl-2 lg:pl-4">
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
              Gumboard
              <BetaBadge />
            </h1>
          </Link>
          {leftContent}
        </div>
        <div className="flex items-center space-x-4">
          {rightContent}
          <div className="mr-3">
            <ProfileDropdown user={user} />
          </div>
        </div>
      </div>
    </div>
  );
}
