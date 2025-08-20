"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface ReactionData {
  id: string;
  emoji: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface GroupedReaction {
  emoji: string;
  count: number;
  users: Array<{ id: string; name: string }>;
  hasReacted: boolean;
}

interface ReactionBarProps {
  noteId: string;
}

const ALL_EMOJIS = ["👍", "👎", "💡", "🚀", "👀"];

export function ReactionBar({ noteId }: ReactionBarProps) {
  const [reactions, setReactions] = useState<GroupedReaction[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();
  const pickerRef = useRef<HTMLDivElement>(null);
  const [buttonElement, setButtonElement] = useState<HTMLElement | null>(null);

  const buttonCallbackRef = useCallback((node: HTMLElement | null) => {
    setButtonElement(node);
  }, []);

  const fetchReactions = async () => {
    try {
      const response = await fetch(`/api/reactions/${noteId}`);
      if (response.ok) {
        const data: ReactionData[] = await response.json();
        processReactions(data);
      }
    } catch (error) {
      console.error("Error fetching reactions:", error);
    }
  };

  const processReactions = (rawReactions: ReactionData[]) => {
    if (!rawReactions || rawReactions.length === 0) {
      setReactions([]);
      return;
    }

    const grouped = rawReactions.reduce((acc, reaction) => {
      const existing = acc.find((r) => r.emoji === reaction.emoji);
      if (existing) {
        existing.count++;
        existing.users.push({
          id: reaction.user.id,
          name: reaction.user.name || reaction.user.email,
        });
      } else {
        acc.push({
          emoji: reaction.emoji,
          count: 1,
          users: [
            {
              id: reaction.user.id,
              name: reaction.user.name || reaction.user.email,
            },
          ],
          hasReacted: false,
        });
      }
      return acc;
    }, [] as GroupedReaction[]);

    const processedReactions = grouped
      .map((reaction) => ({
        ...reaction,
        hasReacted: session?.user
          ? reaction.users.some((user) => user.id === session.user?.id)
          : false,
      }))
      .sort((a, b) => b.count - a.count);

    setReactions(processedReactions);
  };

  const handleReactionClick = async (emoji: string) => {
    if (!session?.user) {
      console.error("User not authenticated");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/reactions/${noteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });

      if (response.ok) {
        await fetchReactions();
        setShowPicker(false);
      } else {
        console.error("Failed to toggle reaction");
      }
    } catch (error) {
      console.error("Error toggling reaction:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        buttonElement &&
        !pickerRef.current.contains(event.target as Node) &&
        !buttonElement.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPicker, buttonElement]);

  useEffect(() => {
    fetchReactions();
  }, [noteId]);

  if (reactions.length === 0 && !session?.user) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 relative">
      {reactions.map((reaction) => (
        <Button
          key={reaction.emoji}
          variant={reaction.hasReacted ? "default" : "outline"}
          size="sm"
          className={`h-7 px-2 text-xs transition-all hover:scale-105 ${
            reaction.hasReacted
              ? "bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200"
              : "hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
          onClick={() => handleReactionClick(reaction.emoji)}
          disabled={loading}
          title={`${reaction.users.map((u) => u.name).join(", ")}`}
        >
          <span className="mr-1">{reaction.emoji}</span>
          <span className="font-medium">{reaction.count}</span>
        </Button>
      ))}

      {session?.user && (
        <div className="relative">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  ref={buttonCallbackRef}
                  variant="outline"
                  size="sm"
                  className={`h-7 px-2 transition-all hover:scale-105 border-dashed ${
                    showPicker
                      ? "bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-600"
                      : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500"
                  }`}
                  onClick={() => setShowPicker(!showPicker)}
                  disabled={loading}
                  aria-label="Add reaction"
                >
                  <Smile className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add reaction</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {showPicker && (
            <div
              ref={pickerRef}
              className="absolute bottom-full right-0 mb-1 p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 w-fit"
            >
              <div className="flex">
                {ALL_EMOJIS.map((emoji, index) => {
                  const hasReacted = reactions.find((r) => r.emoji === emoji)?.hasReacted;
                  return (
                    <button
                      key={emoji}
                      className={`p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-all hover:scale-105 relative ${
                        index === 0
                          ? "rounded-l-md"
                          : index === ALL_EMOJIS.length - 1
                            ? "rounded-r-md"
                            : ""
                      } ${hasReacted ? "bg-blue-50 dark:bg-blue-900/30" : ""}`}
                      onClick={() => handleReactionClick(emoji)}
                      title={hasReacted ? "Remove reaction" : "Add reaction"}
                    >
                      {emoji}
                      {hasReacted && (
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-1 h-1 bg-white rounded-full"></div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
