"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Organization {
  id: string;
  name: string;
  role: 'ADMIN' | 'MEMBER';
}

interface OrganizationSwitcherProps {
  currentOrganization: Organization | null;
  organizations: Organization[];
  onOrganizationChange: (organization: Organization | null) => void;
  showAllOrganizations?: boolean;
  onCreateOrganization?: () => void;
}

export default function OrganizationSwitcher({
  currentOrganization,
  organizations,
  onOrganizationChange,
  showAllOrganizations = false,
  onCreateOrganization,
}: OrganizationSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".organization-switcher")) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (organizations.length === 0) {
    return null;
  }

  return (
    <div className="relative organization-switcher">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        className="flex items-center space-x-2 bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-border dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <Building2 className="w-4 h-4" />
        <span className="font-medium">
          {showAllOrganizations || !currentOrganization ? "All Organizations" : currentOrganization.name}
        </span>
        <ChevronDown className="w-4 h-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 rounded-md shadow-lg border border-border dark:border-zinc-800 z-50">
          <div className="py-1">
            <div className="px-4 py-2 text-sm text-muted-foreground dark:text-zinc-400 border-b dark:border-zinc-800">
              Switch Organization
            </div>
            
            {/* All Organizations Option */}
            <button
              onClick={() => {
                onOrganizationChange(null);
                setIsOpen(false);
              }}
              className={`flex items-center justify-between w-full px-4 py-2 text-sm text-left hover:bg-accent dark:hover:bg-zinc-800 ${
                showAllOrganizations || !currentOrganization
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  : "text-foreground dark:text-zinc-100"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4" />
                <span className="font-medium">All Organizations</span>
              </div>
            </button>

            {/* Individual Organizations */}
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  onOrganizationChange(org);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between w-full px-4 py-2 text-sm text-left hover:bg-accent dark:hover:bg-zinc-800 ${
                  !showAllOrganizations && currentOrganization && org.id === currentOrganization.id
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    : "text-foreground dark:text-zinc-100"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4" />
                  <span className="font-medium">{org.name}</span>
                </div>
                {org.role === 'ADMIN' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    Admin
                  </span>
                )}
              </button>
            ))}

            {onCreateOrganization && (
              <>
                <div className="border-t border-border dark:border-zinc-800 my-1"></div>
                <button
                  onClick={() => {
                    onCreateOrganization();
                    setIsOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-accent dark:hover:bg-zinc-800 text-blue-600 dark:text-blue-400"
                >
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4" />
                    <span className="font-medium">Create New Organization</span>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
