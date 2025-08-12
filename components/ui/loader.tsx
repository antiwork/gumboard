import { cn } from "@/lib/utils";

interface LoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Loader({ className, size = "md" }: LoaderProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 dark:border-zinc-700 dark:border-t-blue-400",
          sizeClasses[size]
        )}
      />
    </div>
  );
}

export function FullPageLoader({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-900">
      <Loader size="lg" className="mb-4" />
      {message && (
        <p className="text-gray-600 dark:text-gray-300 text-lg animate-pulse">{message}</p>
      )}
    </div>
  );
}
