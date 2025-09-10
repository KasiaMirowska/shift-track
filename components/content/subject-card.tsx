import Link from "next/link";
import classes from "./subjectCard.module.css";
import type { SubjectListItem } from "actions/actions";

export default function subjectCard({
  type,
  name,
  id,
  createdAt,
  watchesCount,
  slug,
}: SubjectListItem) {
  console.log("WWWWW", watchesCount);
  return (
    <Link href={`/subject-list/${slug}`} key={id}>
      <li className={classes.item}>
        <div className={classes.badge}>{type}</div>
        <div className={classes.name}>{name}</div>
        <div className={classes.badge}>{watchesCount}</div>
        <div className={classes.meta}>
          Created {new Date(createdAt).toLocaleString()}
        </div>
      </li>
    </Link>
  );
}
