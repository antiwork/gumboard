"use client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { BetaBadge } from "@/components/ui/beta-badge";
import { signOut } from "next-auth/react";
import Link from "next/link";
import {
  Plus,
  Settings,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/components/note";

interface NavbarProps {
  user: User | null;
  onAddBoard?: () => void;
  addBoard?: boolean;
}

export function Navbar({ user, onAddBoard, addBoard }: NavbarProps) {
  const handleSignOut = async () => {
    await signOut();
  };

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
          <Popover>
            <PopoverTrigger asChild>
              <Avatar className="w-9 h-9 cursor-pointer">
                <div className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors ">
                  <AvatarImage className="w-7 h-7 rounded-full" src={user?.image || ""} alt={user?.name || ""} />
                  <AvatarFallback className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-900 dark:text-zinc-100 bg-blue-500 ">
                    <span className="text-sm font-medium text-white">
                      {user?.name
                        ? user.name.charAt(0).toUpperCase()
                        : user?.email?.charAt(0).toUpperCase()}
                    </span>
                  </AvatarFallback>
                </div>
              </Avatar>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-white dark:bg-zinc-900">
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {user?.name || user?.email}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {user?.email}
                </p>
                <Link href={"/settings"} className="flex items-center mt-4 hover:bg-zinc-200 dark:hover:bg-zinc-800 pl-2 dark:hover:text-zinc-50 text-zinc-800 dark:text-zinc-400 rounded-md text-sm gap-2 py-2">
                  <Settings size={19} />
                  Settings
                </Link>
                <div onClick={handleSignOut} className="flex items-center mt-2 group hover:bg-zinc-200 dark:hover:bg-zinc-800 pl-2 text-red-700 dark:hover:text-red-500 rounded-md cursor-pointer text-sm gap-2 py-2">
                  <LogOut size={19} />
                  Sign Out
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </nav>
  );
}