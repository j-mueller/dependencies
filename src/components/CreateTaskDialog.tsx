import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { createTaskInputSchema } from "../model/task-graph";
import type { CreateTaskInput } from "../model/task-graph";

interface CreateTaskDialogProps {
  createdByOptions: readonly string[];
  error: string | undefined;
  isSubmitting: boolean;
  kind: "task" | "subtask";
  onClose: () => void;
  onCreate: (input: CreateTaskInput) => void;
}

function formValue(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export function CreateTaskDialog({
  createdByOptions,
  error,
  isSubmitting,
  kind,
  onClose,
  onCreate,
}: CreateTaskDialogProps) {
  const titleReference = useRef<HTMLInputElement>(null);
  const formReference = useRef<HTMLFormElement>(null);
  const [validationError, setValidationError] = useState<string>();
  const isSubtask = kind === "subtask";
  const createLabel = isSubtask ? "Create sub-task" : "Create task";

  useEffect(() => {
    titleReference.current?.focus();
    const handleKeyboardShortcut = (event: KeyboardEvent): void => {
      if (event.ctrlKey && event.key === "Enter" && !isSubmitting) {
        event.preventDefault();
        formReference.current?.requestSubmit();
        return;
      }
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyboardShortcut);
    return () =>
      document.removeEventListener("keydown", handleKeyboardShortcut);
  }, [isSubmitting, onClose]);

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = createTaskInputSchema.safeParse({
      title: formValue(form, "title"),
      description: formValue(form, "description"),
      status: formValue(form, "status"),
      createdBy: formValue(form, "createdBy"),
      duration: Number(formValue(form, "duration")),
      executionType: formValue(form, "executionType"),
    });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Invalid task");
      return;
    }
    setValidationError(undefined);
    onCreate(parsed.data);
  };

  return (
    <div className="dialog-backdrop">
      <dialog
        open
        className="task-dialog"
        aria-modal="true"
        aria-labelledby="create-task-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">
              {isSubtask ? "Project sub-task" : "Project task"}
            </p>
            <h2
              className="mt-1 text-xl font-semibold text-slate-950"
              id="create-task-title"
            >
              {isSubtask ? "Create a new sub-task" : "Create a new task"}
            </h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close"
            disabled={isSubmitting}
            onClick={onClose}
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <form ref={formReference} className="mt-6 space-y-4" onSubmit={submit}>
          <label className="form-field">
            <span>Title</span>
            <input ref={titleReference} name="title" maxLength={200} required />
          </label>
          <label className="form-field">
            <span>Description</span>
            <textarea name="description" maxLength={20_000} rows={4} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="form-field">
              <span>Created by</span>
              <input
                name="createdBy"
                list="recent-created-by-values"
                maxLength={100}
                autoComplete="off"
                defaultValue={createdByOptions[0] ?? ""}
                required
              />
            </label>
            <datalist id="recent-created-by-values">
              {createdByOptions.map((creator) => (
                <option key={creator} value={creator}>
                  {creator}
                </option>
              ))}
            </datalist>
            <label className="form-field">
              <span>Duration (days)</span>
              <input
                name="duration"
                type="number"
                min="0"
                step="any"
                defaultValue="1"
                required
              />
            </label>
            <label className="form-field">
              <span>Status</span>
              <select name="status" defaultValue="open">
                <option value="open">Open</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="not-planned">Not planned</option>
              </select>
            </label>
            <label className="form-field">
              <span>Execution type</span>
              <select name="executionType" defaultValue="internal">
                <option value="internal">Internal</option>
                <option value="external">External</option>
              </select>
            </label>
          </div>

          {validationError === undefined && error === undefined ? null : (
            <p className="dialog-error" role="alert">
              {validationError ?? error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="secondary-button"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating…" : createLabel}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
