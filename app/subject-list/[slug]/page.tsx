import { getSubjectDetailBySlug } from "actions/actions";
import type { SlugParams } from "lib/types";

interface PageProps {
  params: SlugParams;
}

export default async function SubjectSlugPage({
  params,
}: {
  params: SlugParams;
}) {
  const { slug } = await params;

  const { name, type, updatedAt, opinions, sources, watches } =
    await getSubjectDetailBySlug(slug);
  const test = sources;
  console.log(sources, opinions, watches);
  return (
    <div>
      <h2>{name}</h2>
      <span>type: {type}. </span>
      <span>updatedAt: {updatedAt.toISOString()}</span>
      {opinions.map((o) => (
        <>
          <p>{o.summary}</p>
          <p>{o.sentiment}</p>
          <p>{o.quote}</p>
        </>
      ))}
    </div>
  );
}
