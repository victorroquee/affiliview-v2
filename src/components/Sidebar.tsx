import React from "react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Users, Calculator, TrendingUp, DollarSign, Banknote,
  Boxes, Package, ShieldCheck, FileCheck2, LogOut,
} from "lucide-react";
import type { Page } from "../App";

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  onSignOut: () => void;
  userEmail: string;
}

interface NavItem { page: Page; label: string; icon: LucideIcon; badge?: string; }
interface NavGroup { group: string; items: NavItem[]; }

const NAV: NavGroup[] = [
  { group: "Visão Geral", items: [
    { page: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  ]},
  { group: "Operação", items: [
    { page: "custos", label: "Custos Operacionais", icon: Boxes, badge: "NOVO" },
    { page: "payout", label: "Payout", icon: Banknote, badge: "NOVO" },
  ]},
  { group: "Afiliados", items: [
    { page: "affiliates", label: "Afiliados", icon: Users },
    { page: "cpa-variavel", label: "CPA Variável", icon: Calculator },
    { page: "cpa-fixo", label: "CPA Fixo", icon: DollarSign },
  ]},
  { group: "Produtos", items: [
    { page: "produtos", label: "Produtos", icon: Package, badge: "NOVO" },
  ]},
  { group: "Conferência", items: [
    { page: "conf-cpa", label: "Conferência CPA", icon: ShieldCheck, badge: "NOVO" },
    { page: "conf-vl", label: "Conferência Valor Líq.", icon: FileCheck2, badge: "NOVO" },
  ]},
];

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, onSignOut, userEmail }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/og-logo.png" alt="OG Group" className="sidebar-brand-logo" />
      </div>

      <div className="sidebar-logo">
        <div className="sidebar-logo-mark"><TrendingUp size={14} strokeWidth={1.4} /></div>
        <span className="sidebar-logo-name">AffiliView</span>
        <span className="sidebar-logo-badge">Online</span>
      </div>

      <nav className="sidebar-nav sidebar-nav--grouped">
        {NAV.map((g) => (
          <div className="sidebar-group" key={g.group}>
            <span className="sidebar-section-label">{g.group}</span>
            {g.items.map((it) => (
              <button
                key={it.page}
                className={`sidebar-link ${activePage === it.page ? "active" : ""}`}
                onClick={() => onNavigate(it.page)}
              >
                <it.icon size={15} strokeWidth={1.4} />
                {it.label}
                {it.badge && <span className="sidebar-link-badge">{it.badge}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-avatar">OG</div>
        <div className="sidebar-footer-info">
          <div className="sidebar-footer-name">OG Group</div>
          <div className="sidebar-footer-role" title={userEmail}>{userEmail || "Admin"}</div>
        </div>
        <button className="sidebar-signout" onClick={onSignOut} title="Sair"><LogOut size={15} strokeWidth={1.6} /></button>
      </div>
    </aside>
  );
};

export default Sidebar;
