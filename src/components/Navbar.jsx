
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

const navigation = [
  {
    label: "The Beginning",
    shortLabel: "Home",
    path: "/",
    icon: "⌂",
    end: true,
  },
  {
    label: "Explore Ndenderu",
    shortLabel: "Explore Issues",
    path: "/explore-issues",
    icon: "◈",
  },
];

export default function Navbar({ isAdmin = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const isReporting = location.pathname === "/report-issue";

  return (
    <>
      <style>{`
        /* COMMUNITY CONNECT — NAVBAR */

        .cc2-header {
          position: sticky;
          top: 0;
          z-index: 1100;
          width: 100%;
          padding: 12px 20px;
          background: rgba(248, 250, 247, 0.94);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-bottom: 1px solid rgba(20, 63, 43, 0.08);
        }

        .cc2-inner {
          max-width: 1250px;
          min-height: 68px;
          margin: 0 auto;
          padding: 0 14px 0 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          background: #103c2e;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 20px;
          box-shadow: 0 12px 35px rgba(16,60,46,0.14);
        }

        .cc2-brand {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          color: #fff;
          text-decoration: none;
          flex-shrink: 0;
        }

        .cc2-brand:hover {
          color: #fff;
        }

        .cc2-brand-logo {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          background: #d7f5ba;
          color: #103c2e;
          border-radius: 13px;
          font-size: 28px;
          font-weight: 900;
          line-height: 1;
          transform: rotate(-5deg);
          transition: transform .25s ease;
        }

        .cc2-brand:hover .cc2-brand-logo {
          transform: rotate(0deg) scale(1.05);
        }

        .cc2-brand-name {
          display: block;
          font-size: 19px;
          font-weight: 800;
          letter-spacing: -0.8px;
          line-height: 1.1;
        }

        .cc2-brand-name span {
          color: #c9f5a8;
        }

        .cc2-brand-subtitle {
          display: block;
          margin-top: 4px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 2px;
          color: #a5cbbc;
        }

        .cc2-navigation {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
        }

        .cc2-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 13px 14px;
          border-radius: 11px;
          color: #bed6ca;
          text-decoration: none;
          font-size: 13px;
          font-weight: 650;
          white-space: nowrap;
          transition:
            background .2s ease,
            color .2s ease,
            transform .2s ease;
        }

        .cc2-link:hover {
          color: #fff;
          background: rgba(255,255,255,0.09);
          transform: translateY(-1px);
        }

        .cc2-link.is-active {
          color: #d7f5ba;
          background: rgba(215,245,186,0.11);
        }

        .cc2-link.is-active::after {
          content: "";
          position: absolute;
          bottom: 5px;
          width: 20px;
          height: 3px;
          background: #c9f5a8;
          border-radius: 10px;
        }

        .cc2-link-icon {
          font-size: 18px;
          font-weight: 400;
          line-height: 1;
        }

        .cc2-divider {
          width: 1px;
          height: 28px;
          background: rgba(255,255,255,.16);
          margin: 0 8px;
        }

        .cc2-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 44px;
          padding: 12px 17px;
          border-radius: 12px;
          background: #d7f5ba;
          color: #143c2b;
          font-size: 13px;
          font-weight: 800;
          text-decoration: none;
          white-space: nowrap;
          transition:
            background .2s ease,
            transform .2s ease,
            box-shadow .2s ease;
        }

        .cc2-cta:hover,
        .cc2-cta.is-active {
          background: #f0ffda;
          color: #143c2b;
          transform: translateY(-2px);
          box-shadow: 0 7px 18px rgba(0,0,0,.15);
        }

        .cc2-cta-arrow {
          font-size: 19px;
          line-height: 1;
          transition: transform .2s ease;
        }

        .cc2-cta:hover .cc2-cta-arrow {
          transform: translate(2px, -2px);
        }

        .cc2-menu-button {
          display: none;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border: 1px solid rgba(255,255,255,.2);
          border-radius: 12px;
          background: rgba(255,255,255,.07);
          color: #fff;
          font-size: 23px;
          cursor: pointer;
        }

        .cc2-menu-button:focus-visible,
        .cc2-link:focus-visible,
        .cc2-cta:focus-visible,
        .cc2-brand:focus-visible {
          outline: 3px solid #c9f5a8;
          outline-offset: 3px;
        }

        .cc2-mobile-footer {
          display: none;
        }

        @media (max-width: 950px) {
          .cc2-header {
            padding: 10px 12px;
          }

          .cc2-inner {
            position: relative;
            min-height: 65px;
            padding: 0 13px 0 17px;
            border-radius: 16px;
          }

          .cc2-menu-button {
            display: inline-flex;
          }

          .cc2-navigation {
            position: absolute;
            top: calc(100% + 10px);
            left: 0;
            right: 0;
            display: none;
            flex-direction: column;
            align-items: stretch;
            gap: 7px;
            padding: 15px;
            background: #103c2e;
            border: 1px solid rgba(255,255,255,.14);
            border-radius: 17px;
            box-shadow: 0 20px 40px rgba(0,0,0,.22);
          }

          .cc2-navigation.is-open {
            display: flex;
            animation: cc2-menu-in .2s ease-out;
          }

          .cc2-link {
            justify-content: flex-start;
            min-height: 46px;
            padding: 13px 15px;
          }

          .cc2-link.is-active::after {
            left: 15px;
            bottom: 5px;
          }

          .cc2-divider {
            width: 100%;
            height: 1px;
            margin: 5px 0;
          }

          .cc2-cta {
            justify-content: space-between;
            min-height: 49px;
            padding: 13px 17px;
          }

          .cc2-mobile-footer {
            display: block;
            padding: 12px 5px 2px;
            color: #91b8a7;
            font-size: 10px;
            letter-spacing: 1.3px;
            text-align: center;
          }

          @keyframes cc2-menu-in {
            from {
              opacity: 0;
              transform: translateY(-8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        }

        @media (max-width: 420px) {
          .cc2-brand-name {
            font-size: 17px;
          }

          .cc2-brand-subtitle {
            font-size: 8px;
            letter-spacing: 1.4px;
          }

          .cc2-brand-logo {
            width: 39px;
            height: 39px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cc2-header *,
          .cc2-header *::before,
          .cc2-header *::after {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <header className="cc2-header">
        <div className="cc2-inner">
          {/* BRAND */}
          <NavLink
            to="/"
            className="cc2-brand"
            aria-label="Community Connect homepage"
          >
            <span className="cc2-brand-logo" aria-hidden="true">
              c
            </span>

            <span>
              <span className="cc2-brand-name">
                community<span>connect</span>
              </span>

              <span className="cc2-brand-subtitle">
                NDENDERU WARD · KENYA
              </span>
            </span>
          </NavLink>

          {/* MOBILE MENU BUTTON */}
          <button
            type="button"
            className="cc2-menu-button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="cc2-main-navigation"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? "×" : "☰"}
          </button>

          {/* NAVIGATION */}
          <nav
            id="cc2-main-navigation"
            className={`cc2-navigation ${menuOpen ? "is-open" : ""}`}
            aria-label="Main navigation"
          >
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `cc2-link ${isActive ? "is-active" : ""}`
                }
                title={item.shortLabel}
                onClick={() => setMenuOpen(false)}
              >
                <span
                  className="cc2-link-icon"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            ))}

            {isAdmin && (
              <NavLink
                to="/admin/dashboard"
                className={({ isActive }) =>
                  `cc2-link ${isActive ? "is-active" : ""}`
                }
                onClick={() => setMenuOpen(false)}
              >
                <span
                  className="cc2-link-icon"
                  aria-hidden="true"
                >
                  ◫
                </span>
                Command Center
              </NavLink>
            )}

            <span className="cc2-divider" aria-hidden="true" />

            <NavLink
              to="/report-issue"
              className={`cc2-cta ${
                isReporting ? "is-active" : ""
              }`}
              onClick={() => setMenuOpen(false)}
            >
              <span>✦ Raise Your Voice</span>
              <span
                className="cc2-cta-arrow"
                aria-hidden="true"
              >
                ↗
              </span>
            </NavLink>

            <span className="cc2-mobile-footer">
              YOUR WARD · YOUR VOICE · OUR FUTURE
            </span>
          </nav>
        </div>
      </header>
    </>
  );
}
