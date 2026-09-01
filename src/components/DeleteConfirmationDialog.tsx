import { TriangleAlert, X } from "lucide-react";
import { useEffect, useRef } from "react";

interface DeleteConfirmationDialogProps {
  confirmLabel: string;
  description: string;
  error: string | undefined;
  isSubmitting: boolean;
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmationDialog({
  confirmLabel,
  description,
  error,
  isSubmitting,
  title,
  onCancel,
  onConfirm,
}: DeleteConfirmationDialogProps) {
  const cancelReference = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelReference.current?.focus();
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !isSubmitting) {
        onCancel();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isSubmitting, onCancel]);

  return (
    <div className="dialog-backdrop">
      <dialog
        open
        className="task-dialog"
        aria-modal="true"
        aria-labelledby="delete-confirmation-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="mt-0.5 rounded-full bg-rose-100 p-2 text-rose-700">
              <TriangleAlert aria-hidden="true" size={18} />
            </span>
            <div>
              <p className="eyebrow">Permanent action</p>
              <h2
                className="mt-1 text-xl font-semibold text-slate-950"
                id="delete-confirmation-title"
              >
                {title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <p className="mt-5 text-sm leading-6 text-slate-600">{description}</p>
        {error === undefined ? null : (
          <p className="dialog-error mt-4" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelReference}
            type="button"
            className="secondary-button"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="danger-button"
            disabled={isSubmitting}
            onClick={onConfirm}
          >
            {isSubmitting ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </dialog>
    </div>
  );
}
