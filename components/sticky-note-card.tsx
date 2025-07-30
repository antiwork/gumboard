"use client"

import * as React from "react"
import { useRef, useEffect } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Plus, Trash2 } from "lucide-react"
import type { ChangeEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"

export type Task = {
  id: number
  text: string
  completed: boolean
}

export type Note = {
  id: number
  author: {
    name: string
    initial: string
  }
  color: string
  tasks: Task[]
}

type StickyNoteCardProps = {
  note: Note
  onUpdate: (note: Note) => void
  onDelete: (noteId: number) => void
}

const taskItemVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: "auto", transition: { duration: 0.2 } },
  exit: { opacity: 0, height: 0, transition: { duration: 0.15 } },
}

export function StickyNoteCard({ note, onUpdate, onDelete }: StickyNoteCardProps) {
  const newTaskIdRef = useRef<number | null>(null)

  const handleTaskToggle = (taskId: number) => {
    const updatedTasks = note.tasks.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task))
    onUpdate({ ...note, tasks: updatedTasks })
  }

  const handleTaskTextChange = (e: ChangeEvent<HTMLInputElement>, taskId: number) => {
    const updatedTasks = note.tasks.map((task) => (task.id === taskId ? { ...task, text: e.target.value } : task))
    onUpdate({ ...note, tasks: updatedTasks })
  }

  const handleDeleteTask = (taskId: number) => {
    const updatedTasks = note.tasks.filter((task) => task.id !== taskId)
    onUpdate({ ...note, tasks: updatedTasks })
  }

  const handleAddTask = () => {
    const newTaskId = Date.now()
    const newTask: Task = {
      id: newTaskId,
      text: "New task",
      completed: false,
    }
    newTaskIdRef.current = newTaskId
    onUpdate({ ...note, tasks: [...note.tasks, newTask] })
  }

  useEffect(() => {
    if (newTaskIdRef.current) {
      const newInput = document.querySelector(`input[data-task-id="${newTaskIdRef.current}"]`) as HTMLInputElement
      if (newInput) {
        newInput.focus()
        newInput.select()
      }
      newTaskIdRef.current = null
    }
  }, [note.tasks])

  return (
    <div className={cn("flex flex-col gap-4 rounded-xl p-4 transition-all", note.color)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 border-2 border-white">
            <AvatarFallback>{note.author.initial}</AvatarFallback>
          </Avatar>
          <span className="font-semibold">{note.author.name}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(note.id)}>
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete note</span>
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <AnimatePresence>
          {note.tasks.map((task) => (
            <motion.div
              key={task.id}
              className="flex items-center gap-3"
              variants={taskItemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              layout
            >
              <Checkbox
                id={`task-${task.id}`}
                checked={task.completed}
                onCheckedChange={() => handleTaskToggle(task.id)}
                className="border-slate-500 bg-white/50"
              />
              <Input
                type="text"
                value={task.text}
                onChange={(e) => handleTaskTextChange(e, task.id)}
                data-task-id={task.id}
                className={cn(
                  "h-auto flex-1 border-none bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0",
                  task.completed && "text-slate-500 line-through",
                )}
                style={{ overflow: 'visible' }}
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 opacity-50 hover:opacity-100" 
                onClick={() => handleDeleteTask(task.id)}
              >
                <Trash2 className="h-3 w-3" />
                <span className="sr-only">Delete task</span>
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <Button variant="ghost" size="sm" onClick={handleAddTask} className="mt-1 justify-start text-slate-600">
        <Plus className="mr-2 h-4 w-4" />
        Add task
      </Button>
    </div>
  )
}
