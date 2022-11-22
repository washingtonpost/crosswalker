import {
  INSTRUCTIONS_URL,
  SOURCE_URL,
  SPREADSHEET_INSTRUCTIONS_URL,
  WASHINGTON_POST_URL,
} from "../urls";
import wp from "../assets/wp.svg";
import { AppReducer } from "../state";

export function Footer({ app, reducer }: AppReducer) {
  return (
    <div className="footer">
      <nav>
        <a
          className="image-link"
          href={WASHINGTON_POST_URL}
          target="_blank"
          rel="noreferrer"
        >
          <img src={wp} alt="Washington Post" />
        </a>
        <span>•</span>
        <a
          href={
            app.type === "MatchingState"
              ? SPREADSHEET_INSTRUCTIONS_URL
              : INSTRUCTIONS_URL
          }
          target="_blank"
          rel="noreferrer"
        >
          Instructions
        </a>
        <span>•</span>
        <a href={SOURCE_URL} target="_blank" rel="noreferrer">
          Source code
        </a>
      </nav>
    </div>
  );
}
