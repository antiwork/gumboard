"use client";

import { BetaBadge } from "@/components/ui/beta-badge";
import Link from "next/link";
import type { User } from "@/components/note";
import { cn } from "@/lib/utils";
import { ProfileDropdown } from "@/components/profile-dropdown";

interface NavbarProps {
  user: User | null;
  boardActions?: React.ReactNode;
  userActions?: React.ReactNode;
  className?: string;
}

export function Navbar({ 
  user, 
  boardActions,
  userActions,
  className
}: NavbarProps) {

  return (
    <nav className={cn("bg-card dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 shadow-sm", className)}>
      <div className="flex justify-between items-center h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <Link href="/dashboard">
              <h1 className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                Gumboard
                <BetaBadge />
              </h1>
            </Link>
          </div>
          {boardActions && <div className="flex items-center space-x-4">{boardActions}</div>}
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          {userActions && <div className="flex items-center space-x-2 sm:space-x-4">{userActions}</div>}
          <ProfileDropdown user={user} />
        </div>
      </div>
    </nav>
  );
}