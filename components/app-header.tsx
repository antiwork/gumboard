import React from "react";
import Link from "next/link";
import { BetaBadge } from "@/components/ui/beta-badge";
import { ProfileDropdown } from "@/components/profile-dropdown";
import type { User } from "@/components/note";

interface AppHeaderProps {
  user: User | null;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  variant?: "dashboard" | "board" | "settings" | "public";
}

export function AppHeader({ user, leftContent, rightContent, variant = "dashboard" }: AppHeaderProps) {
  const isBoard = variant === "board";
  const isPublic = variant === "public";
  const linkDestination = isPublic ? "/" : "/dashboard";
  
  return (
    <div className="bg-card dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 shadow-sm">
      <div className={`flex ${isBoard ? "flex-wrap sm:flex-nowrap" : ""} justify-between items-center ${isBoard ? "h-auto sm:h-16 p-2 sm:p-0" : "h-16 px-4 sm:px-6 lg:px-8"}`}>
        <div className={`flex ${isBoard ? "flex-wrap sm:flex-nowrap" : ""} items-center ${isBoard ? "gap-2 sm:space-x-3 w-full sm:w-auto" : isPublic ? "space-x-3" : ""}`}>
          <Link href={linkDestination} className={`flex-shrink-0 ${isBoard ? "pl-4 sm:pl-2 lg:pl-4" : isPublic ? "pl-4 sm:pl-2 lg:pl-4" : ""}`}>
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
              Gumboard
              <BetaBadge />
            </h1>
          </Link>
          
          {leftContent}
        </div>
        
        <div className={`flex ${isBoard ? "flex-wrap sm:flex-nowrap" : ""} items-center ${isBoard ? "gap-2 w-full sm:w-auto mt-2 sm:mt-0" : isPublic ? "space-x-2 px-3" : "space-x-2 sm:space-x-4"}`}>
          {rightContent}
          {!isPublic && (
            <div className={isBoard ? "mr-3" : ""}>
              <ProfileDropdown user={user} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 