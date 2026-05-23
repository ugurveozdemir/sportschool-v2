type PageHeaderProps = {
  title: string;
  description: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header style={{ marginBottom: 24 }}>
      <h1 style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700 }}>{title}</h1>
      <p style={{ margin: "8px 0 0", color: "var(--text-muted)", fontSize: 15 }}>{description}</p>
    </header>
  );
}
