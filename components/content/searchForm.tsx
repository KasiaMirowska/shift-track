import { SUBJECT_TYPES } from "lib/types";
import classes from "./searchForm.module.css";
import SubmitForm from "./submitForm";
import { createSubject } from "actions/actions";

export interface SearchFormProps {
  key: number;
  createSubject: (formData: FormData) => Promise<void>;
  resetForm: () => void;
}
export interface SubjectFormData {
  name: string;
  topic: SUBJECT_TYPES;
}

export default function SearchForm() {
  const subjectTypes = Object.values(SUBJECT_TYPES);

  return (
    <div className={classes.page}>
      <form className={classes.form} action={createSubject}>
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
            className={classes.input}
            required
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
            {subjectTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <SubmitForm />
        </div>
      </form>
    </div>
  );
}
