import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-zinc-900 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-zinc-900 dark:border-zinc-800">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
            <Search className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-2xl text-zinc-900 dark:text-zinc-100">
              Page Not Found
            </CardTitle>
            <CardDescription className="text-zinc-600 dark:text-zinc-400 mt-2">
              Sorry, we couldn't find the page you're looking for.
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-3">
            <Link href="/dashboard" className="w-full">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
            
            <Link href="/" className="w-full">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
          
          <div className="text-center pt-4 border-t border-gray-200 dark:border-zinc-700">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Need help? Check our{" "}
              <Link 
                href="/dashboard" 
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                boards
              </Link>{" "}
              or{" "}
              <Link 
                href="/settings" 
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                settings
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
