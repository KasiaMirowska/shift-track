"use client";

import { useState } from "react";
import classes from "./errorModule.module.css";

export default function ErrorModule({ message }: { message: string }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div className={classes.errorToast} role="alert" aria-live="polite">
      <p className={classes.errorText}>{message}</p>
      <button
        className={classes.dismissButton}
        onClick={() => setOpen(false)}
        aria-label="Dismiss error"
      >
        ×
      </button>
    </div>
  );
}
