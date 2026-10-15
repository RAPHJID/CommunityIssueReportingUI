function ReportFilters({
  search,
  onSearchChange,
  activeFilter,
  onFilterChange,
  filters,
}) {
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Community reports</h2>
          <p className="muted">
            Follow reported issues and their current status.
          </p>
        </div>

        <input
          className="search"
          type="search"
          placeholder="Search reports..."
          aria-label="Search reports"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="filters" aria-label="Filter reports by status">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`filter-button ${
              activeFilter === filter ? "active" : ""
            }`}
            aria-pressed={activeFilter === filter}
            onClick={() => onFilterChange(filter)}
          >
            {filter}
          </button>
        ))}
      </div>
    </>
  );
}

export default ReportFilters;