"use client";

import { useId, type ReactNode } from "react";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export type FieldDef<T> = {
    key: keyof T & string;
    label: string;
    placeholder?: string;
    type?: "text" | "textarea" | "url" | "number";
    required?: boolean;
    width?: "full" | "half";
};

interface EditableListProps<T> {
    items: T[];
    fields: FieldDef<T>[];
    onChange: (next: T[]) => void;
    itemLabel: string;
    onAdd?: () => void;
    addLabel?: string;
    emptyHint?: string;
    /**
     * The "add new" draft row's inputs. The parent keeps owning the draft
     * state (e.g. `newEducation`/`setNewEducation`) and passes its existing,
     * unchanged draft-form JSX here; `EditableList` only positions it under
     * the editable items and renders the "Add" button that calls `onAdd()`.
     */
    children?: ReactNode;
}

function FieldControl<T>({
    field,
    value,
    id,
    onChange,
}: {
    field: FieldDef<T>;
    value: unknown;
    id: string;
    onChange: (value: string) => void;
}) {
    const stringValue = value === undefined || value === null ? "" : String(value);
    const baseClassName =
        "w-full rounded-[var(--r-sm)] border border-border bg-background px-3 py-2 text-sm text-foreground";

    if (field.type === "textarea") {
        return (
            <textarea
                id={id}
                className={`${baseClassName} min-h-[80px]`}
                placeholder={field.placeholder}
                value={stringValue}
                onChange={(e) => onChange(e.target.value)}
                required={field.required}
            />
        );
    }

    const inputType = field.type === "url" ? "url" : field.type === "number" ? "number" : "text";

    return (
        <input
            id={id}
            type={inputType}
            className={baseClassName}
            placeholder={field.placeholder}
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
        />
    );
}

/**
 * Renders a list of items as editable rows (one input per field, plus a
 * delete button) instead of read-only text. Editing a field emits a new
 * array with only that item's field replaced — the parent owns the state
 * and passes it straight to its `set*` state setter via `onChange`.
 *
 * Optionally renders the parent-owned draft row (`children`) plus an "Add"
 * button that calls `onAdd()`.
 */
export function EditableList<T extends object>({
    items,
    fields,
    onChange,
    itemLabel,
    onAdd,
    addLabel,
    emptyHint,
    children,
}: EditableListProps<T>) {
    const uid = useId();

    const updateItemField = (
        index: number,
        field: FieldDef<T>,
        rawValue: string
    ) => {
        // "number" fields must keep emitting a number (or undefined), not the
        // raw input string, so the item stays assignable to its real type.
        const value: unknown =
            field.type === "number" ? (rawValue === "" ? undefined : Number(rawValue)) : rawValue;
        const next = items.map((item, i) => (i === index ? { ...item, [field.key]: value } : item));
        onChange(next);
    };

    const removeItem = (index: number) => {
        onChange(items.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-4">
            {items.length === 0 && emptyHint && (
                <p className="text-sm text-muted-foreground">{emptyHint}</p>
            )}

            {items.map((item, index) => (
                <div
                    key={index}
                    className="p-3 bg-muted rounded-[var(--r-md)] space-y-3"
                    style={{ boxShadow: "var(--e-raised)" }}
                >
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {fields.map((field) => {
                                const fieldId = `${uid}-${itemLabel}-${index}-${field.key}`;
                                return (
                                    <div
                                        key={field.key}
                                        className={field.width === "half" ? "" : "sm:col-span-2"}
                                    >
                                        <label
                                            htmlFor={fieldId}
                                            className="block text-xs text-muted-foreground mb-1"
                                        >
                                            {field.label}
                                        </label>
                                        <FieldControl
                                            field={field}
                                            id={fieldId}
                                            value={item[field.key]}
                                            onChange={(value) =>
                                                updateItemField(index, field, value)
                                            }
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            aria-label={`Remove ${itemLabel} ${index + 1}`}
                            onClick={() => removeItem(index)}
                            className="flex items-center justify-center size-11 shrink-0 rounded-[var(--r-sm)] text-red-500 hover:bg-red-500/10"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}

            {onAdd && (
                <div className="space-y-2 pt-2 border-t border-border">
                    {children}
                    <Button onClick={onAdd} className="w-full h-11 lg:h-9">
                        <Plus className="w-4 h-4 mr-2" /> {addLabel || `Add ${itemLabel}`}
                    </Button>
                </div>
            )}
        </div>
    );
}
