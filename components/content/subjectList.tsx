import { listSubjects } from "@/actions/actions";
import classes from "./subjectList.module.css";

export default async function SubjectList() {
  const subjects = await listSubjects();

  if (!subjects.length) {
    return (
      <p className={classes.empty}>No subjects yet. Add one to get started.</p>
    );
  }

  return (
    <ul className={classes.list}>
      {subjects.map((s) => (
        <li key={s.id} className={classes.item}>
          <div className={classes.badge}>{s.type}</div>
          <div className={classes.name}>{s.name}</div>
          <div className={classes.meta}>
            Created {new Date(s.createdAt).toLocaleString()}
          </div>
        </li>
      ))}
    </ul>
  );
}
