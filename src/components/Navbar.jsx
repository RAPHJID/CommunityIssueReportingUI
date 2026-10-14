function Navbar() {
  return (
    <header className="navbar">
      <div className="nav-inner">
        <a className="brand" href="#home" aria-label="Community Connect home">
          <span className="brand-icon" aria-hidden="true">⌂</span>
          <span>Community Connect</span>
        </a>

        <nav className="nav-links" aria-label="Main navigation">
          <a className="nav-home-link" href="#home">Home</a>
          <a className="nav-reports-link" href="#reports">
            Community Reports
          </a>
          <a className="nav-report-button" href="#reports">
            View Reports
          </a>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
