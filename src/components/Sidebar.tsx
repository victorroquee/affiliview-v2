import React from "react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Users, Calculator, TrendingUp, DollarSign, Banknote,
  Boxes, Package, ShieldCheck, FileCheck2, LogOut, Settings as SettingsIcon,
} from "lucide-react";
import type { Page } from "../App";
import { useSettings } from "../hooks/useSettings";

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  onSignOut: () => void;
  userEmail: string;
}

interface NavItem { page: Page; labelKey: string; icon: LucideIcon; badge?: boolean; }
interface NavGroup { groupKey: string; items: NavItem[]; }

const NAV: NavGroup[] = [
  { groupKey: "nav.group.overview", items: [
    { page: "dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  ]},
  { groupKey: "nav.group.operation", items: [
    { page: "custos", labelKey: "nav.custos", icon: Boxes, badge: true },
    { page: "payout", labelKey: "nav.payout", icon: Banknote, badge: true },
  ]},
  { groupKey: "nav.group.affiliates", items: [
    { page: "affiliates", labelKey: "nav.affiliates", icon: Users },
    { page: "cpa-variavel", labelKey: "nav.cpaVariavel", icon: Calculator },
    { page: "cpa-fixo", labelKey: "nav.cpaFixo", icon: DollarSign },
  ]},
  { groupKey: "nav.group.products", items: [
    { page: "produtos", labelKey: "nav.produtos", icon: Package, badge: true },
  ]},
  { groupKey: "nav.group.audit", items: [
    { page: "conf-cpa", labelKey: "nav.confCpa", icon: ShieldCheck, badge: true },
    { page: "conf-vl", labelKey: "nav.confVl", icon: FileCheck2, badge: true },
  ]},
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return letters || "OG";
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, onSignOut, userEmail }) => {
  const { t, settings } = useSettings();
  const { displayName, accountName } = settings;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/og-logo.png" alt="OG Group" className="sidebar-brand-logo" />
      </div>

      <div className="sidebar-logo">
        <div className="sidebar-logo-mark"><TrendingUp size={14} strokeWidth={1.4} /></div>
        <span className="sidebar-logo-name">AffiliView</span>
        <span className="sidebar-logo-badge">{t("sidebar.online")}</span>
      </div>

      <nav className="sidebar-nav sidebar-nav--grouped">
        {NAV.map((g) => (
          <div className="sidebar-group" key={g.groupKey}>
            <span className="sidebar-section-label">{t(g.groupKey)}</span>
            {g.items.map((it) => (
              <button
                key={it.page}
                className={`sidebar-link ${activePage === it.page ? "active" : ""}`}
                onClick={() => onNavigate(it.page)}
              >
                <it.icon size={15} strokeWidth={1.4} />
                {t(it.labelKey)}
                {it.badge && <span className="sidebar-link-badge">{t("badge.new")}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-avatar">{initialsOf(accountName)}</div>
        <div className="sidebar-footer-info">
          <div className="sidebar-footer-name" title={accountName}>{displayName || "OG Group"}</div>
          <div className="sidebar-footer-role" title={userEmail}>{userEmail || "Admin"}</div>
        </div>
        <button className="sidebar-signout" onClick={onSignOut} title={t("sidebar.signout")}><LogOut size={15} strokeWidth={1.6} /></button>
      </div>

      <button
        className={`sidebar-settings ${activePage === "settings" ? "active" : ""}`}
        onClick={() => onNavigate("settings")}
      >
        <SettingsIcon size={15} strokeWidth={1.5} />
        {t("nav.settings")}
      </button>
    </aside>
  );
};

export default Sidebar;
