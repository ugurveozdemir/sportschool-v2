type MethodBadgeProps = {
  method: "GET" | "POST" | "PUT" | "DELETE";
};

export function MethodBadge({ method }: MethodBadgeProps) {
  return <span className={`method-badge method-${method.toLowerCase()}`}>{method}</span>;
}
