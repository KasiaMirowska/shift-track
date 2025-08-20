import SearchSubject from "./search-subject/page";
import SubjectList from "./subject-list/page";

export default function Home() {
  return (
    <div>
      {/* <main> */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}> Welcome to Shift Track:</h1>
        <p style={{ color: "#666" }}>
          Track what’s been said — and see the bigger picture.
        </p>
      </div>
      <section>
        <SearchSubject />
      </section>
      <section>
        <SubjectList />
      </section>
      {/* </main> */}
    </div>
  );
}
