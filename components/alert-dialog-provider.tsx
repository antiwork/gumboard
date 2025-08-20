"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AlertOptions {
  title: string;
  description: string;
  variant?: "success" | "error";
}

interface AlertDialogContextType {
  showAlert: (options: AlertOptions) => void;
}

const AlertDialogContext = createContext<AlertDialogContextType | undefined>(undefined);

export function AlertDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AlertOptions & { open: boolean }>({
    open: false,
    title: "",
    description: "",
    variant: "error",
  });

  const showAlert = ({ title, description, variant = "error" }: AlertOptions) => {
    setState({ open: true, title, description, variant });
  };

  const handleOpenChange = (open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  };

  return (
    <AlertDialogContext.Provider value={{ showAlert }}>
      {children}
      <AlertDialog open={state.open} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground dark:text-zinc-100">
              {state.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-zinc-400">
              {state.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => handleOpenChange(false)}
              className={
                state.variant === "success"
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

export function useAlertDialog() {
  const context = useContext(AlertDialogContext);
  if (!context) {
    throw new Error("useAlertDialog must be used within an AlertDialogProvider");
  }
  return context;
}
