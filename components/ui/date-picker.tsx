"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

function formatDate(date: Date | undefined) {
  if (!date) return ""
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function isValidDate(date: Date | undefined) {
  if (!date) return false
  return !isNaN(date.getTime())
}

export interface DatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: string
  onValueChange?: (value: string) => void
  label?: string
  placeholder?: string
}

export function DatePicker({
  value: controlledValue,
  onValueChange,
  label,
  placeholder = "e.g., June 01, 2025",
  ...inputProps
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [month, setMonth] = React.useState<Date | undefined>(undefined)
  // Internal value if not controlled
  const [internalValue, setInternalValue] = React.useState("")
  const value = controlledValue !== undefined ? controlledValue : internalValue
  // Parse value to Date
  let date: Date | undefined = undefined
  if (value) {
    const parsed = new Date(value)
    if (!isNaN(parsed.getTime())) date = parsed
  }
  React.useEffect(() => {
    if (date) setMonth(date)
  }, [value])

  return (
    <div className="flex flex-col gap-3">
      {label && <Label htmlFor="date" className="px-1">{label}</Label>}
      <div className="relative flex gap-2">
        <Input
          id="date"
          value={value}
          placeholder={placeholder}
          className="bg-background pr-10"
          {...inputProps}
          onChange={e => {
            if (onValueChange) onValueChange(e.target.value)
            else setInternalValue(e.target.value)
          }}
          onKeyDown={e => {
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setOpen(true)
            }
            if (inputProps.onKeyDown) inputProps.onKeyDown(e)
          }}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id="date-picker"
              variant="ghost"
              className="absolute top-1/2 right-2 size-6 -translate-y-1/2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700"
              type="button"
              tabIndex={-1}
            >
              <CalendarIcon className="size-3.5" />
              <span className="sr-only">Select date</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden p-0 bg-white dark:bg-zinc-800"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <Calendar
                mode="single"
                selected={date}
                captionLayout="dropdown"
                month={month}
                onMonthChange={setMonth}
                onSelect={date => {
                    if (!date) return
                    const formatted = formatDate(date)
                    if (onValueChange) onValueChange(formatted)
                    else setInternalValue(formatted)
                    setOpen(false)
                }}
                modifiersClassNames={{
                    outside: "text-gray-400 opacity-50 pointer-events-none",
                }}
                classNames={{
                    day: "hover:bg-sky-500 transition-colors duration-200 rounded",
                    disabled: "opacity-50 cursor-not-allowed hover:bg-transparent",
                    selected: "bg-sky-500 text-white hover:bg-sky-600",
                }}
                className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
