function ReportStatistics({ statistics }) {
  return (
    <section className="container stats" aria-label="Report statistics">
      <div className="stat">
        <div className="stat-label">Total reports</div>
        <div className="stat-number">{statistics.total}</div>
      </div>

      <div className="stat">
        <div className="stat-label">Awaiting resolution</div>
        <div className="stat-number">{statistics.unresolved}</div>
      </div>

      <div className="stat">
        <div className="stat-label">Resolved reports</div>
        <div className="stat-number">{statistics.resolved}</div>
      </div>
    </section>
  );
}

export default ReportStatistics;
