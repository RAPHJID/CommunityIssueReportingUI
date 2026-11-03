import "./CommunityReports.css";

function ReportStatistics({ statistics }) {
  const cards = [
    { label: "Total reports", value: statistics.total, note: "Issues shared by residents", icon: "▦", variant: "total", number: "01" },
    { label: "Awaiting resolution", value: statistics.unresolved, note: "Issues still needing attention", icon: "◷", variant: "pending", number: "02" },
    { label: "Resolved reports", value: statistics.resolved, note: "Reports marked as resolved", icon: "✓", variant: "resolved", number: "03" },
  ];
  return (
    <section className="container cc-stats" aria-label="Community report statistics">
      <div className="cc-stats-heading"><span className="cc-stats-heading-dot" /> COMMUNITY AT A GLANCE <span className="cc-stats-heading-rule" /></div>
      <div className="cc-stats-grid">
        {cards.map((card) => (
          <div className={`cc-stat-card cc-stat-card--${card.variant}`} key={card.label}>
            <div className="cc-stat-top"><span className="cc-stat-icon" aria-hidden="true">{card.icon}</span><span className="cc-stat-index">{card.number} / 03</span></div>
            <div className="cc-stat-value">{Number(card.value ?? 0).toLocaleString()}</div>
            <div className="cc-stat-label">{card.label}</div>
            <div className="cc-stat-note">{card.note}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ReportStatistics;
