import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="text-lg">Page not found</div>
      <Button asChild>
        <Link href="/">Go to Gumboard home</Link>
      </Button>
    </div>
  );
}
