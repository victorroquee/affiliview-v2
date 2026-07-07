import React from "react";
import { LayoutDashboard, Users, Calculator, TrendingUp, DollarSign, Banknote, LogOut } from "lucide-react";

type Page = "dashboard" | "affiliates" | "cpa-fixo" | "cpa-variavel" | "payout";

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  onSignOut: () => void;
  userEmail: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, onSignOut, userEmail }) => {
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
          className={`sidebar-link ${activePage === "payout" ? "active" : ""}`}
          onClick={() => onNavigate("payout")}
        >
          <Banknote size={15} strokeWidth={1.4} />
          Payout
          <span className="sidebar-link-badge">NOVO</span>
        </button>
        <button
          className={`sidebar-link ${activePage === "cpa-variavel" ? "active" : ""}`}
          onClick={() => onNavigate("cpa-variavel")}
        >
          <Calculator size={15} strokeWidth={1.4} />
          CPA Variavel
        </button>
        <button
          className={`sidebar-link ${activePage === "cpa-fixo" ? "active" : ""}`}
          onClick={() => onNavigate("cpa-fixo")}
        >
          <DollarSign size={15} strokeWidth={1.4} />
          CPA Fixo
        </button>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-avatar">OG</div>
        <div className="sidebar-footer-info">
          <div className="sidebar-footer-name">OG Group</div>
          <div className="sidebar-footer-role" title={userEmail}>{userEmail || "Admin"}</div>
        </div>
        <button className="sidebar-signout" onClick={onSignOut} title="Sair">
          <LogOut size={15} strokeWidth={1.6} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
