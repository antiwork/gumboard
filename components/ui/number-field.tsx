"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type NumberFieldProps = React.InputHTMLAttributes<HTMLInputElement>;

const NumberField = React.forwardRef<HTMLInputElement, NumberFieldProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const handleIncrement = () => {
      const numericValue = Number(value || 0);
      const newValue = numericValue + 1;
      onChange?.({
        target: { value: newValue.toString() },
      } as React.ChangeEvent<HTMLInputElement>);
    };

    const handleDecrement = () => {
      const numericValue = Number(value || 0);
      const minProp = Number(props.min || -Infinity);

      if (numericValue <= minProp) return;

      const newValue = numericValue - 1;
      onChange?.({
        target: { value: newValue.toString() },
      } as React.ChangeEvent<HTMLInputElement>);
    };

    return (
      <div
        className={cn(
          "flex h-9 w-full overflow-hidden rounded-md border focus-within:border-2 focus-within:border-zinc-500 dark:focus-within:border-zinc-600",
          "border-zinc-400 dark:border-zinc-700",
          className
        )}
      >
        <button
          type="button"
          onClick={handleDecrement}
          className="w-10 flex items-center justify-center text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 hover:bg-zinc-400 dark:hover:bg-zinc-700"
          disabled={props.disabled}
        >
          -
        </button>
        <input
          type="number"
          className={cn(
            "flex-1 w-full text-center bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            "text-zinc-900 dark:text-zinc-100",
            // hide the scroller arrows completely
            "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
          )}
          ref={ref}
          value={value}
          onChange={onChange}
          {...props}
        />
        <button
          type="button"
          onClick={handleIncrement}
          className="w-10 flex items-center justify-center text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 hover:bg-zinc-400 dark:hover:bg-zinc-700"
          disabled={props.disabled}
        >
          +
        </button>
      </div>
    );
  }
);
NumberField.displayName = "NumberField";

export { NumberField };
