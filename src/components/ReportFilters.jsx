import "./CommunityReports.css";

function ReportFilters({ search, onSearchChange, activeFilter, onFilterChange, filters }) {
  const hasFilters = search.trim() !== "" || activeFilter !== "All Reports";
  return (
    <div className="cc-report-explorer">
      <div className="cc-explorer-header">
        <div>
          <span className="cc-explorer-eyebrow"><span className="cc-eyebrow-line" /> THE COMMUNITY PULSE</span>
          <h2>Explore community reports<span className="cc-title-period">.</span></h2>
          <p>Every concern deserves to be seen. Explore what residents have shared and follow its progress.</p>
        </div>
        <div className="cc-explorer-mark" aria-hidden="true">⌁</div>
      </div>
      <div className="cc-explorer-controls">
        <label className="cc-search-field">
          <span className="cc-search-icon" aria-hidden="true">⌕</span>
          <span className="cc-visually-hidden">Search community reports</span>
          <input type="search" placeholder="Search by issue or keyword..." value={search} onChange={(event) => onSearchChange(event.target.value)} />
          {search && <button type="button" className="cc-search-clear" onClick={() => onSearchChange("")} aria-label="Clear search">×</button>}
        </label>
        {hasFilters && <button type="button" className="cc-clear-filters" onClick={() => { onSearchChange(""); onFilterChange("All Reports"); }}>Clear filters <span aria-hidden="true">×</span></button>}
      </div>
      <div className="cc-filter-scroller" role="group" aria-label="Filter reports by status">
        {filters.map((filter) => (
          <button key={filter} type="button" className={`cc-filter-pill${activeFilter === filter ? " cc-filter-pill--active" : ""}`} aria-pressed={activeFilter === filter} onClick={() => onFilterChange(filter)}>
            {filter === "All Reports" && <span className="cc-filter-grid" aria-hidden="true">▦</span>}{filter}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ReportFilters;
