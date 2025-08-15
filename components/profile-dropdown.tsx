import { signOut } from "next-auth/react";
import Link from "next/link";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "./note";

type Props = {
  user: User | null;
};

export function ProfileDropdown({ user }: Props) {
  const handleSignOut = async () => {
    await signOut();
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Avatar className="w-9 h-9 cursor-pointer">
          <div className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ">
            <AvatarImage
              className="w-8.5 h-8.5 rounded-full"
              src={user?.image || ""}
              alt={user?.name || ""}
            />
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
      <PopoverContent className="w-64 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-100 dark:border-zinc-800 p-2">
        <div className="p-2">
          <p className="font-medium text-foreground dark:text-zinc-100">
            {user?.name || user?.email}
          </p>
          <p className="text-xs text-muted-foreground dark:text-zinc-400">{user?.email}</p>
        </div>
        <div className="border-t border-zinc-100 dark:border-zinc-800 my-1"></div>
        <div className="flex flex-col gap-1">
          <Link
            href={"/settings"}
            className="rounded-lg block font-medium px-3 py-1.5 text-sm hover:text-white hover:bg-sky-600 dark:hover:bg-sky-600 text-foreground dark:text-zinc-100"
          >
            Settings
          </Link>

          <div
            onClick={handleSignOut}
            className="rounded-lg block font-medium px-3 py-1.5 text-sm hover:text-white hover:bg-sky-600 dark:hover:bg-sky-600 cursor-pointer dark:text-white"
          >
            Sign out
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
