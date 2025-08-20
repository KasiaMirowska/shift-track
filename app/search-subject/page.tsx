import ErrorModule from "components/content/errorModule";
import SearchForm from "components/content/searchForm";
import classes from "components/content/errorModule.module.css";

export default function SearchSubjectPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const error = searchParams?.error as string | undefined;
  return (
    <div className={error ? classes.withToastPadding : undefined}>
      <SearchForm />
      {error && <ErrorModule message={error} />}
    </div>
  );
}
