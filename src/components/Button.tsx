export interface ButtonProps {
  slim?: boolean;
  icon?: {
    url: string;
    alt: string;
  };
  disabled?: boolean;
  type?: "primary" | "secondary" | "inverted" | "danger";
  children?: React.ReactNode;
  onClick?: () => void;
}

export function Button({
  slim = false,
  icon,
  type = "primary",
  disabled = false,
  children,
  onClick = () => {},
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`${type}-button ${slim ? "slim" : ""} ${
        disabled ? "disabled" : ""
      }`}
      onClick={onClick}
    >
      {icon && <img src={icon.url} alt={icon.alt} />}
      <span>{children}</span>
    </button>
  );
}
