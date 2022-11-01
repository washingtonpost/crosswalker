import { ReactNode } from "react";
import logo from "../assets/logo.svg";

export function Header({ children }: { children?: ReactNode }) {
  return (
    <header className="App-header">
      <h1>
        <img src={logo} className="App-logo" alt="logo" />
        <span>Crosswalker</span>
        {children}
      </h1>
    </header>
  );
}
