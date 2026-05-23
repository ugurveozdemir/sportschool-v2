import { PageHeader } from "./PageHeader";

type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <section className="card">
        <div className="card-body" style={{ color: "var(--text-muted)" }}>
          Bu bölüm sonraki parçada gerçek endpoint formları ve tablolarıyla bağlanacak.
        </div>
      </section>
    </div>
  );
}
