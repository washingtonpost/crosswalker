import { ReactNode } from "react";
import logo from "../assets/logo.svg";

/** A page header component */
export function Header({
  children,
  lowBottom = false,
  flex = false,
}: {
  children?: ReactNode;
  /** If true, makes the bottom margin lower */
  lowBottom?: boolean;
  /** If true, makes the header use flex positioning */
  flex?: boolean;
}) {
  return (
    <header
      className={`App-header ${lowBottom ? "low-bottom" : ""} ${
        flex ? "flex" : ""
      }`}
    >
      <h1>
        <span>
          <img src={logo} className="no-select App-logo" alt="logo" />
          <span
            className={`crosswalker-text no-select ${
              flex ? "extra-right" : ""
            }`}
          >
            Crosswalker
          </span>
        </span>
        {children}
      </h1>
    </header>
  );
}
