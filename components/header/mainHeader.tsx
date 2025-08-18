import Link from "next/link";
import classes from "./mainHeader.module.css";
import NavLink from "./navLink";

export default function MainHeader() {
  return (
    <header className={classes.header}>
      <Link className={classes.logo} href="/">
        {/* <Image src={logo} alt="plate of food" priority /> */}
        Shift Track
      </Link>
      <nav className={classes.nav}>
        <ul>
          <li>
            <NavLink href="/searchSubject">Search</NavLink>
          </li>

          <li>
            <NavLink href="/subjectList">Subject List</NavLink>
          </li>
        </ul>
      </nav>
    </header>
  );
}
