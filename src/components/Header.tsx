import { ReactNode } from "react";
import logo from "../assets/logo.svg";

export function Header({
  children,
  lowBottom = false,
}: {
  children?: ReactNode;
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
