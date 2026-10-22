import { loadGuide } from "./guide";

export const metadata = { title: "Hướng dẫn sử dụng · Sổ Yến" };

export default function GuidePage() {
  const { intro, toc, html } = loadGuide();
  const tocLinks = (
    <ol className="space-y-0.5">
      {toc.map((item) => (
        <li key={item.id}>
          <a href={`#${item.id}`} className="block rounded-lg px-3 py-1.5 text-sm text-ink! hover:bg-brand-soft">
            {item.label}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="mx-auto max-w-5xl lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-8">
      <div className="min-w-0 space-y-4">
        <section className="hero-card">
          <div className="text-sm text-brand-tint">Sổ Yến</div>
          <h1 className="text-2xl font-semibold">Hướng dẫn sử dụng</h1>
          <p className="mt-2 text-sm text-white/85" dangerouslySetInnerHTML={{ __html: intro }} />
        </section>

        <details className="rounded-2xl border border-line bg-white lg:hidden">
          <summary className="cursor-pointer px-4 py-3 font-medium">Mục lục</summary>
          <div className="px-1 pb-3">{tocLinks}</div>
        </details>

        <article className="guide rounded-2xl border border-line bg-white px-4 py-2 md:px-8 md:py-4" dangerouslySetInnerHTML={{ __html: html }} />
      </div>

      <aside className="hidden lg:block">
        <nav className="sticky top-8 rounded-2xl border border-line bg-white p-2">
          <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted/70">Mục lục</div>
          {tocLinks}
        </nav>
      </aside>
    </div>
  );
}
