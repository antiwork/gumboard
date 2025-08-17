import { Skeleton } from "./ui/skeleton";

export const BoardPageSkeleton = () => {
  const skeletonNoteCount = 5;
  return (
    <div className="min-h-screen max-w-screen bg-zinc-100 dark:bg-zinc-800 bg-dots">
      <div>
        <div className="mx-2 flex flex-wrap sm:flex-nowrap justify-between items-center h-auto sm:h-16 p-2 sm:p-0">
          <div className="bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 rounded-lg dark:border-zinc-800 mt-2 py-2 px-3 flex flex-wrap sm:flex-nowrap items-center w-full sm:w-auto">
            <div>
              <Skeleton className="h-10 w-38" />
            </div>
            <div className="h-6 w-px m-1.5 bg-zinc-100 dark:bg-zinc-700" />
            <div className="flex-1 mr-0 sm:flex-none">
              <Skeleton className="h-10 w-28" />
            </div>
            <div className="h-6 w-px m-1.5 bg-zinc-100 dark:bg-zinc-700" />
            <Skeleton className="h-10 w-10" />
          </div>

          <div className="bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 rounded-lg dark:border-zinc-800 mt-2 py-2 px-3 flex flex-wrap sm:flex-nowrap items-center sm:space-x-3 w-full sm:w-auto">
            <div className="flex justify-between gap-2 items-center w-full sm:w-auto">
              <Skeleton className="h-10 w-42 sm:w-64 pl-10 pr-8" />
              <Skeleton className="h-10 w-24 rounded-md" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 mt-4 xl:mt-8 px-4 xl:px-8 gap-4">
        {Array.from({ length: skeletonNoteCount }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-md flex flex-col p-5 w-full"
            style={{ minHeight: 190 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-5 w-28" />
            </div>
            <Skeleton className="h-4 w-40 mb-3" />
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="h-4 w-48 mb-3" />
            <Skeleton className="h-4 w-20 mb-3" />
          </div>
        ))}
      </div>
    </div>
  );
};
