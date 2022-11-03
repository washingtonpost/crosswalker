import { ReactNode } from "react";
import logo from "../assets/logo.svg";

/** A page header component */
export function Header({
  children,
  lowBottom = false,
}: {
  children?: ReactNode;
  /** If true, makes the bottom margin lower */
  lowBottom?: boolean;
}) {
  return (
    <header className={`App-header ${lowBottom ? "low-bottom" : ""}`}>
      <h1>
        <img src={logo} className="App-logo" alt="logo" />
        <span>Crosswalker</span>
        {children}
      </h1>
    </header>
  );
}
