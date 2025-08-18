import { SUBJECT_TYPES } from "@/lib/types";
import classes from "./searchForm.module.css";

export default function SearchSubject() {
  const isPending = false; //add a state hook later
  return (
    <form className={classes.form}>
      <header>
        <h3>
          Start a news pool by entering the name or topic we will compile
          information on.
        </h3>
      </header>
      <div className={classes.row}>
        <label className={classes.label} htmlFor="name">
          Subject name
        </label>
        <input
          id="name"
          name="name"
          placeholder="e.g 'Donald Trump' or 'openAi'"
          required
          className={classes.input}
        />
      </div>

      <div className={classes.row}>
        <label className={classes.label} htmlFor="type">
          Type
        </label>
        <select
          id="type"
          name="type"
          defaultValue="PERSON"
          required
          className={classes.select}
        >
          {SUBJECT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button type="submit" disabled={isPending} className={classes.button}>
          {isPending ? "Saving" : "Add Search Subject"}
        </button>
      </div>
    </form>
  );
}
