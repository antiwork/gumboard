import { Plus } from "lucide-react";
import type { ActionButton } from "@/components/navigation-bar";

export const createDashboardNavConfig = (onAddBoard: () => void): ActionButton[] => [
  {
    label: "Add Board",
    icon: <Plus className="w-4 h-4" />,
    onClick: onAddBoard,
    variant: "primary",
    hideOnMobile: false
  }
];

export const createBoardNavConfig = (onAddNote: () => void): ActionButton[] => [
  {
    label: "Add Note",
    icon: <Plus className="w-4 h-4" />,
    onClick: onAddNote,
    variant: "primary",
  }
];
