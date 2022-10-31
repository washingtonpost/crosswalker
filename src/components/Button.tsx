export interface ButtonProps {
  slim?: boolean;
  icon?: {
    url: string;
    alt: string;
  };
  type?: "primary" | "secondary" | "inverted";
  children?: React.ReactNode;
  onClick?: () => void;
}

export function Button({
  slim = false,
  icon,
  type = "primary",
  children,
  onClick = () => {},
}: ButtonProps) {
  return (
    <button
      className={`${type}-button ${slim ? "slim" : ""}`}
      onClick={onClick}
    >
      {icon && <img src={icon.url} alt={icon.alt} />}
      <span>{children}</span>
    </button>
  );
}
