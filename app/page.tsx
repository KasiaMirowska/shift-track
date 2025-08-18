import Image from "next/image";
import styles from "./page.module.css";
import SearchSubject from "./search-subject/page";
import SubjectList from "./subject-list/page";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0 }}> Welcome to Shift Track:</h1>
          <p style={{ color: "#666" }}>
            Track what’s been said — and see the bigger picture.
          </p>
        </header>
        <section>
          <SearchSubject />
        </section>
        <section>
          <SubjectList />
        </section>
      </main>
    </div>
  );
}
