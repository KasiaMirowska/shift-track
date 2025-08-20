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

  const detailedSubjectData = await getSubjectDetailBySlug(slug);
  console.log("DDDD", detailedSubjectData);
  return <div>{slug}</div>;
}
