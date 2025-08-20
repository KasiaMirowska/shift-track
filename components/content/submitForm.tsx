"use client";
import { useFormStatus } from "react-dom";
import classes from "./searchForm.module.css";

export default function SubmitForm() {
  const { pending } = useFormStatus();
  return (
    <>
      <button type="submit" disabled={pending} className={classes.button}>
        {pending && <span className={classes.spinner} aria-hidden="true" />}
        {pending ? "Saving…" : "Add Search Subject"}
      </button>
      {/* <button
        type="reset"
        className={classes.button}
        onClick={() => resetForm()}
      >
        Reset Form
      </button> */}
    </>
  );
}
