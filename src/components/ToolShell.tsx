export default function ToolShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <h1 className="text-center font-display text-3xl font-bold text-deep-ink">{title}</h1>
      <p className="mt-2 text-center text-ink/60">{description}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}
