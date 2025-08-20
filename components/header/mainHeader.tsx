import Link from "next/link";
import classes from "./mainHeader.module.css";
import NavLink from "./navLink";

export default function MainHeader() {
  return (
    <header className={classes.header}>
      <Link className={classes.logo} href="/">
        Shift Track
      </Link>
      <nav className={classes.nav}>
        <ul>
          <li>
            <NavLink href="/search-subject">Search</NavLink>
          </li>

          <li>
            <NavLink href="/subject-list">Subject List</NavLink>
          </li>
        </ul>
      </nav>
    </header>
  );
}
