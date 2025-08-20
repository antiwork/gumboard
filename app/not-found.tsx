import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4x">
      <h1 className="text-7xl font-extrabold dark:text-white">404</h1>
      <p className="mt-4 text-xl text-gray-700 dark:text-white/80">Page not found</p>
      <div className="mt-6">
        <Button asChild>
          <Link href="/">Go to Gumboard</Link>
        </Button>
      </div>
    </div>
  );
}
