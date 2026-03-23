import React from "react";
import { LayoutDashboard, Users, Calculator } from "lucide-react";

type Page = "dashboard" | "affiliates" | "calculator";

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">OG</div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-name">AFFILIVIEW</div>
          <div className="sidebar-logo-sub">by OG GROUP</div>
        </div>
      </div>

      <div className="sidebar-section-label">Navegação</div>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-link ${activePage === "dashboard" ? "active" : ""}`}
          onClick={() => onNavigate("dashboard")}
        >
          <LayoutDashboard size={16} />
          Dashboard Geral
        </button>
        <button
          className={`sidebar-link ${activePage === "affiliates" ? "active" : ""}`}
          onClick={() => onNavigate("affiliates")}
        >
          <Users size={16} />
          Afiliados
        </button>
        <button
          className={`sidebar-link ${activePage === "calculator" ? "active" : ""}`}
          onClick={() => onNavigate("calculator")}
        >
          <Calculator size={16} />
          Calculadora CPA
        </button>
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-footer-version">v3.0</span>
        <span className="sidebar-footer-api">API LIVE</span>
      </div>
    </aside>
  );
};

export default Sidebar;
