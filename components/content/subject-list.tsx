import { listSubjects } from "actions/actions";
import classes from "./subjectList.module.css";
import type { Subject } from "actions/actions";
import Link from "next/link";

export default async function SubjectList() {
  const subjects: Subject[] = await listSubjects();

  if (!subjects.length) {
    return (
      <p className={classes.empty}>No subjects yet. Add one to get started.</p>
    );
  }

  return (
    <ul className={classes.list}>
      {subjects.map((s) => (
        <Link href={`/subject-list/${s.slug}`} key={s.id}>
          <li className={classes.item}>
            <div className={classes.badge}>{s.type}</div>
            <div className={classes.name}>{s.name}</div>
            <div className={classes.meta}>
              Created {new Date(s.createdAt).toLocaleString()}
            </div>
          </li>
        </Link>
      ))}
    </ul>
  );
}
