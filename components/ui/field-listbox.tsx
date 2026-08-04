"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type FieldListboxOption = { value: string; label: string };

export function FieldListbox({
  id,
  name,
  label,
  icon: Icon,
  iconTone = "terracotta",
  placeholder,
  options,
  value,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  icon: LucideIcon;
  iconTone?: "terracotta" | "sage";
  placeholder: string;
  options: FieldListboxOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="al-field">
      <label htmlFor={id} className="al-field-label">
        {label}
      </label>
      <div className="al-listbox" ref={containerRef}>
        <input type="hidden" name={name} value={value} />
        <button
          ref={triggerRef}
          type="button"
          id={id}
          className="al-listbox-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <Icon
            className={cn(
              "al-listbox-icon-svg",
              iconTone === "terracotta" ? "al-listbox-icon-terracotta" : "al-listbox-icon-sage"
            )}
            aria-hidden="true"
          />
          <span className={cn("al-listbox-value", !selected && "al-listbox-placeholder")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown className="al-listbox-chevron" aria-hidden="true" />
        </button>

        {open && (
          <ul className="al-listbox-panel" role="listbox" aria-labelledby={id}>
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={cn("al-listbox-option", isSelected && "al-listbox-option-selected")}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                      triggerRef.current?.focus();
                    }}
                  >
                    {isSelected && <Check className="al-listbox-check" aria-hidden="true" />}
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
