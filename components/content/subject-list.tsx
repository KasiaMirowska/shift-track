import { listSubjects } from "actions/actions";
import classes from "./subjectList.module.css";
import type { SubjectListItem } from "actions/actions";
import Link from "next/link";
import SubjectCard from "./subject-card";

export default async function SubjectList() {
  const subjects: SubjectListItem[] = await listSubjects();
  // const test = await diagCounts();
  // const test2 = await listSubjectsRaw();
  console.log("TEETING", subjects);
  if (!subjects.length) {
    return (
      <p className={classes.empty}>No subjects yet. Add one to get started.</p>
    );
  }

  return (
    <ul className={classes.list}>
      {subjects.map((s) => (
        <div key={s.id}>
          <SubjectCard {...s} />
        </div>
      ))}
    </ul>
  );
}
