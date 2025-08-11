import { Button } from "@/components/ui/button";
import { BetaBadge } from "@/components/ui/beta-badge";
import Link from "next/link";
import {
  Plus,
} from "lucide-react";
import type { User } from "@/components/note";
import { ProfileDropdown } from "@/components/profile-dropdown";

interface NavbarProps {
  user: User | null;
  onAddBoard?: () => void;
  addBoard?: boolean;
}

export function Navbar({ user, onAddBoard, addBoard }: NavbarProps) {

  return (
    <nav className="bg-card dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 shadow-sm">
      <div className="flex justify-between items-center h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Link
              href="/dashboard"
            >
              <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                Gumboard
                <BetaBadge />
              </h1>
            </Link>
          </div>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          {addBoard && (
            <Button
              onClick={onAddBoard}
              className="flex items-center space-x-1 sm:space-x-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 border-0 font-medium px-3 sm:px-4 py-2 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Board</span>
            </Button>
          )}
          <ProfileDropdown user={user} />
        </div>
      </div>
    </nav>
  );
}