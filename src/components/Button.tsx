export interface ButtonProps {
  /** Whether the button should be a slim variant */
  slim?: boolean;
  /** An optional icon to associate with the button */
  icon?: {
    /** The URL of the icon asset */
    url: string;
    /** Alt text on the icon */
    alt: string;
  };
  /** Whether the button is disabled */
  disabled?: boolean;
  /** The button variant */
  type?: "primary" | "secondary" | "inverted" | "danger";
  /** Whether to add a small margin at the bottom (default: false) */
  extraBottom?: boolean;
  /** The click handler for the button */
  onClick?: () => void;
  children?: React.ReactNode;
}

/** A button component */
export function Button({
  slim = false,
  icon,
  type = "primary",
  disabled = false,
  extraBottom = false,
  children,
  onClick = () => {},
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`${type}-button ${slim ? "slim" : ""} ${
        disabled ? "disabled" : ""
      } ${extraBottom ? "extra-bottom" : ""}`}
      onClick={onClick}
    >
      {icon && <img src={icon.url} alt={icon.alt} />}
      <span>{children}</span>
    </button>
  );
}
