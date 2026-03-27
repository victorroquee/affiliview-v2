import React from "react";
import { LayoutDashboard, Users, Calculator, TrendingUp, DollarSign, Mail } from "lucide-react";

type Page = "dashboard" | "affiliates" | "calculator" | "cpa-fixo" | "mail";

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  return (
    <aside className="sidebar">
      {/* OG Group Logo */}
      <div className="sidebar-brand">
        <img src="/og-logo.png" alt="OG Group" className="sidebar-brand-logo" />
      </div>

      {/* App identity */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <TrendingUp size={14} strokeWidth={1.4} />
        </div>
        <span className="sidebar-logo-name">AffiliView</span>
        <span className="sidebar-logo-badge">Online</span>
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
        <button
          className={`sidebar-link ${activePage === "cpa-fixo" ? "active" : ""}`}
          onClick={() => onNavigate("cpa-fixo")}
        >
          <DollarSign size={15} strokeWidth={1.4} />
          CPA Fixo
        </button>
      </nav>

      {/* Recuperação */}
      <span className="sidebar-section-label">Recuperação</span>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-link ${activePage === "mail" ? "active" : ""}`}
          onClick={() => onNavigate("mail")}
        >
          <Mail size={15} strokeWidth={1.4} />
          Mail Vendas
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
