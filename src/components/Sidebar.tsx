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
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">OG</div>
        <span className="sidebar-logo-name">AffiliView</span>
        <span className="sidebar-logo-badge">Stats</span>
      </div>

      {/* Navegação */}
      <span className="sidebar-section-label">Visão geral</span>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-link ${activePage === "dashboard" ? "active" : ""}`}
          onClick={() => onNavigate("dashboard")}
        >
          <LayoutDashboard size={15} strokeWidth={1.4} />
          Dashboard
        </button>
        <button
          className={`sidebar-link ${activePage === "affiliates" ? "active" : ""}`}
          onClick={() => onNavigate("affiliates")}
        >
          <Users size={15} strokeWidth={1.4} />
          Afiliados
        </button>
        <button
          className={`sidebar-link ${activePage === "calculator" ? "active" : ""}`}
          onClick={() => onNavigate("calculator")}
        >
          <Calculator size={15} strokeWidth={1.4} />
          Calculadora CPA
        </button>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-avatar">OG</div>
        <div className="sidebar-footer-info">
          <div className="sidebar-footer-name">OG Group</div>
          <div className="sidebar-footer-role">Admin</div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
