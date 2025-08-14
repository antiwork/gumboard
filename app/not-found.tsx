import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Page not found</h1>
        <Button asChild>
          <Link href="/">Go to Gumboard</Link>
        </Button>
      </div>
    </div>
  );
}
