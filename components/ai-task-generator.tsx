"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader } from "@/components/ui/loader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChecklistItem } from "@/components/checklist-item";
import { Label } from "@/components/ui/label";
import { Sparkles, Plus, CheckCircle } from "lucide-react";
import { AgentTask } from "@/lib/openai";

interface AITaskGeneratorProps {
  noteContent: string;
  boardId: string;
  existingTasks?: ChecklistItem[];
  onAddTasks?: (tasks: ChecklistItem[]) => void;
  disabled?: boolean;
  hasOpenAIKey?: boolean;
}

export function AITaskGenerator({ boardId, existingTasks = [], onAddTasks, disabled, hasOpenAIKey = false }: AITaskGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestedTasks, setSuggestedTasks] = useState<AgentTask[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const handleGenerateTasks = async () => {
    if (!input.trim()) return;

    setIsProcessing(true);
    setError(null);
    setSuggestedTasks([]);

    try {
      const response = await fetch("/api/agent/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          noteContent: input,
          boardId,
          existingTasks,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error?.includes("API key")) {
          throw new Error("AI not configured. Please add OpenAI API key in Settings.");
        }
        throw new Error(errorData.error || "Failed to generate tasks");
      }

      const data = await response.json();
      
      if (data.tasks && data.tasks.length > 0) {
        // Generate unique IDs for each task using same pattern as existing checklist items
        const tasksWithIds = data.tasks.map((task: Omit<AgentTask, 'id'>, index: number): AgentTask => ({
          ...task,
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${index}`,
        }));
        
        setSuggestedTasks(tasksWithIds);
        setSelectedTasks(new Set(tasksWithIds.map((t: AgentTask) => t.id)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddSelectedTasks = () => {
    if (selectedTasks.size === 0 || !onAddTasks) return;

    const tasksToAdd = suggestedTasks
      .filter((task) => selectedTasks.has(task.id))
      .map((task) => ({
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: task.content,
        checked: false,
        order: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

    onAddTasks(tasksToAdd);
    setIsOpen(false);
    setSuggestedTasks([]);
    setSelectedTasks(new Set());
    setInput("");
  };

  const toggleTaskSelection = (taskId: string) => {
    const newSelection = new Set(selectedTasks);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    setSelectedTasks(newSelection);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1"
          title="Generate tasks with AI"
          aria-label="AI Assistant"
        >
          <Sparkles className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800">
        <DialogHeader className="pb-4 border-b border-gray-100 dark:border-zinc-800">
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            Generate Tasks with AI
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-zinc-400 text-base">
            Describe what you want to accomplish and AI will break it down into actionable tasks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!hasOpenAIKey ? (
            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-2">
                AI Task Assistant Not Configured
              </h3>
              <p className="text-gray-600 dark:text-zinc-400 mb-4">
                To use AI-powered task generation, you need to configure your OpenAI API key.
              </p>
              <div className="text-sm text-gray-500 dark:text-zinc-500">
                <p className="mb-2">
                  <strong>How to set up:</strong>
                </p>
                <ol className="text-left space-y-1 inline-block">
                  <li>1. Go to Settings → Organization → AI Task Assistant</li>
                  <li>2. Add your OpenAI API key</li>
                  <li>3. Save changes</li>
                </ol>
              </div>
              <p className="text-xs text-gray-500 dark:text-zinc-500 mt-4">
                Don&apos;t have an API key?{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
                >
                  Get one from OpenAI
                </a>
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <Label htmlFor="task-input" className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                  What would you like to work on?
                </Label>
                <div className="flex space-x-3">
                  <Input
                    id="task-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="e.g. Learn React hooks, Plan quarterly review, Build landing page..."
                    className="flex-1 h-10 border-gray-200 dark:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 bg-white dark:bg-zinc-900"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleGenerateTasks();
                      }
                    }}
                  />
                  <Button
                    onClick={handleGenerateTasks}
                    disabled={isProcessing || !input.trim()}
                    className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
                  >
                    {isProcessing ? (
                      <>
                        <Loader size="sm" className="mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-200 font-medium">{error}</p>
                  {error.includes("API key") && (
                    <p className="text-xs text-red-700 dark:text-red-300 mt-2">
                      Go to Settings → Organization → AI Task Assistant to configure your OpenAI API key.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {suggestedTasks.length > 0 && hasOpenAIKey && (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-zinc-100">
                    Generated Tasks
                  </h4>
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                    {selectedTasks.size}/{suggestedTasks.length} selected
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (selectedTasks.size === suggestedTasks.length) {
                      setSelectedTasks(new Set());
                    } else {
                      setSelectedTasks(new Set(suggestedTasks.map((t) => t.id)));
                    }
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  {selectedTasks.size === suggestedTasks.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {suggestedTasks.map((task, index) => (
                  <div
                    key={task.id}
                    className={`group flex items-start space-x-3 p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedTasks.has(task.id)
                        ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 shadow-sm"
                        : "bg-gray-50 dark:bg-zinc-800/50 border-2 border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:border-gray-300 dark:hover:border-zinc-600"
                    }`}
                    onClick={() => toggleTaskSelection(task.id)}
                  >
                    <div className="flex items-center mt-0.5">
                      {selectedTasks.has(task.id) ? (
                        <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-400 dark:border-zinc-500 rounded group-hover:border-gray-500 dark:group-hover:border-zinc-400 transition-colors" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-zinc-100 leading-5">
                          {task.content}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-zinc-400 font-mono bg-gray-100 dark:bg-zinc-700 px-2 py-1 rounded-full shrink-0">
                          #{index + 1}
                        </span>
                      </div>
                      {task.priority && (
                        <span
                          className={`inline-block mt-2 px-3 py-1 text-xs font-medium rounded-full ${
                            task.priority === "high"
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                              : task.priority === "medium"
                              ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {task.priority} priority
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-zinc-800">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSuggestedTasks([]);
                    setSelectedTasks(new Set());
                    setInput("");
                  }}
                  className="border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-zinc-300"
                >
                  Start Over
                </Button>
                <Button
                  onClick={handleAddSelectedTasks}
                  disabled={selectedTasks.size === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm min-w-[140px]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add {selectedTasks.size} Task{selectedTasks.size !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}