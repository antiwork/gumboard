"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createContext, ReactNode, useContext, useState } from "react";

interface AlertDialogContextType {
  showDialog: ({
    title,
    description,
    variant,
  }: {
    title: string;
    description: string;
    variant: "default" | "success" | "error";
  }) => void;
}

const AlertDialogContext = createContext<AlertDialogContextType | undefined>(undefined);

export function AlertDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    variant: "default" | "success" | "error";
  }>({ open: false, title: "", description: "", variant: "success" });

  const showDialog = ({
    title,
    description,
    variant,
  }: {
    title: string;
    description: string;
    variant: "default" | "success" | "error";
  }) => {
    setDialog({
      open: true,
      title: title,
      description: description,
      variant: variant,
    });
  };
  return (
    <AlertDialogContext.Provider value={{ showDialog }}>
      {children}
      <AlertDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog({ open, title: "", description: "", variant: "default" })}
      >
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground dark:text-zinc-100">
              {dialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-zinc-400">
              {dialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() =>
                setDialog({ open: false, title: "", description: "", variant: "default" })
              }
              className={
                dialog.variant === "success"
                  ? "bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
              }
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AlertDialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(AlertDialogContext);
  if (context === undefined) {
    throw new Error("useDialog must be used within a AlertDialogProvider");
  }
  return context;
}
