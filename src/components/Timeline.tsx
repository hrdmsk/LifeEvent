import type { TimelineEntry } from "../types";

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <section className="card">
      <h2>タイムライン</h2>
      {entries.length === 0 ? (
        <p className="muted">まだ記録がありません。</p>
      ) : (
        entries.map((it) => (
          <div className="timeline-item" key={it.event.id}>
            <time>{it.event.date}</time>
            <h3>
              {it.event.title}
              {it.verified && <span className="badge">✓ 検証OK</span>}
            </h3>
            {it.event.memo && <p className="muted">{it.event.memo}</p>}
          </div>
        ))
      )}
    </section>
  );
}
