import React, { useMemo, useState } from "react";
import {
  type TransactionRow,
  type AffiliateRow,
  type AffiliateRanking,
  type AffiliateRankingInfo,
  computeFromFiltered,
  computeAffiliateRankings,
  isMaileonardo,
  formatEur,
  formatPct,
  formatInt,
} from "../lib/transactions";
import { Users } from "lucide-react";
import LoadingDot from "../components/LoadingDot";
import InfoTooltip from "../components/InfoTooltip";
import AffiliateDrawer from "../components/AffiliateDrawer";

interface AffiliatesPageProps {
  filteredRows: TransactionRow[];
  allRows:      TransactionRow[];
  periodDays:   number | undefined;
  loading:      boolean;
}

const RANKING_LABEL: Record<AffiliateRanking, string> = {
  "Tier 1": "Tier 1", "Tier 2": "Tier 2", "Tier 3": "Tier 3",
  "Ativo": "Ativo", "Em Rampa": "Em Rampa", "Inativo": "Inativo",
};
const RANKING_CLASS: Record<AffiliateRanking, string> = {
  "Tier 1": "tier-1", "Tier 2": "tier-2", "Tier 3": "tier-3",
  "Ativo": "tier-ativo", "Em Rampa": "tier-em-rampa", "Inativo": "tier-inativo",
};

const RANKING_SORT_ORDER: Record<AffiliateRanking, number> = {
  "Tier 1": 0, "Tier 2": 1, "Tier 3": 2, "Ativo": 3, "Em Rampa": 4, "Inativo": 5,
};

const RANKING_TOOLTIP =
  "Calculado com base nos últimos 7 dias de dados disponíveis. " +
  "Regra: 3 dias consecutivos acima do faturamento do tier + 3 de 4 nos dias seguintes. " +
  "Tier 3: ≥€1k/dia · Tier 2: ≥€5k/dia · Tier 1: ≥€15k/dia · Ativo: ≥10 vendas/7 dias · Em Rampa: 1–9 vendas/7 dias.";

function formatDaysAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso + "T00:00:00Z").getTime()) / 86400000);
  if (d === 0) return "hoje";
  if (d === 1) return "ontem";
  return `${d} dias atrás`;
}

const AffiliatesPage: React.FC<AffiliatesPageProps> = ({
  filteredRows,
  allRows,
  periodDays,
  loading,
}) => {
  const [selectedAffiliate, setSelectedAffiliate] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AffiliateRanking | "all">("all");

  const affiliates: AffiliateRow[] = useMemo(() => {
    if (filteredRows.length === 0) return [];
    const m = computeFromFiltered(filteredRows, periodDays);
    return m.topAffiliates.filter((a) => !isMaileonardo(a.name));
  }, [filteredRows, periodDays]);

  const rankings: Map<string, AffiliateRankingInfo> = useMemo(
    () => computeAffiliateRankings(allRows.filter((r) => !isMaileonardo(r.affiliate))),
    [allRows]
  );

  const activeCount = useMemo(() =>
    [...rankings.values()].filter(r => ["Tier 1", "Tier 2", "Tier 3", "Ativo"].includes(r.ranking)).length,
    [rankings]
  );
  const emRampaCount = useMemo(() =>
    [...rankings.values()].filter(r => r.ranking === "Em Rampa").length,
    [rankings]
  );
  const inativoCount = useMemo(() =>
    [...rankings.values()].filter(r => r.ranking === "Inativo").length,
    [rankings]
  );

  const sortedAffiliates = useMemo(() => {
    return [...affiliates].sort((a, b) => {
      const ra = rankings.get(a.name)?.ranking ?? "Inativo";
      const rb = rankings.get(b.name)?.ranking ?? "Inativo";
      const orderDiff = RANKING_SORT_ORDER[ra] - RANKING_SORT_ORDER[rb];
      if (orderDiff !== 0) return orderDiff;
      return b.gross - a.gross; // within same rank, sort by gross descending
    });
  }, [affiliates, rankings]);

  const filteredAffiliates = useMemo(() => {
    if (statusFilter === "all") return sortedAffiliates;
    if (statusFilter === "Ativo") {
      // "Ativos" tab includes Tier 1/2/3 + Ativo
      return sortedAffiliates.filter(a => {
        const r = rankings.get(a.name)?.ranking ?? "Inativo";
        return ["Tier 1", "Tier 2", "Tier 3", "Ativo"].includes(r);
      });
    }
    return sortedAffiliates.filter(a => {
      const r = rankings.get(a.name)?.ranking ?? "Inativo";
      return r === statusFilter;
    });
  }, [sortedAffiliates, statusFilter, rankings]);

  const drawerAffiliate = affiliates.find((a) => a.name === selectedAffiliate) ?? null;
  const drawerRanking   = selectedAffiliate ? (rankings.get(selectedAffiliate) ?? null) : null;

  if (affiliates.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon-row">
          <Users size={36} strokeWidth={1.4} />
          {loading && <LoadingDot />}
        </div>
        <h3>{loading ? "Buscando transações..." : "Sem dados de afiliados"}</h3>
        <p>
          {loading
            ? "Aguarde enquanto os dados são carregados da API Digistore24."
            : "Aguarde o carregamento dos dados ou ajuste o período de busca."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="section-header">
        <h2>Resultados por Afiliado</h2>
      </div>

      <div className="aff-summary-badges">
        <span className="tier-badge tier-ativo">{activeCount} Ativos</span>
        <span className="tier-badge tier-em-rampa">{emRampaCount} Em Rampa</span>
        <span className="tier-badge tier-inativo">{inativoCount} Inativos</span>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h3>Ranking de Afiliados</h3>
          <p>
            Clique em uma linha para ver detalhes · {filteredAffiliates.length} afiliados ·
            Maileonardo contabilizado em Mail Vendas
          </p>
          <div className="product-tabs" style={{ marginTop: 8 }}>
            <span>Filtrar:</span>
            {(["all", "Ativo", "Em Rampa", "Inativo"] as const).map((f) => (
              <button
                key={f}
                className={`product-tab ${statusFilter === f ? "active" : ""}`}
                onClick={() => setStatusFilter(f as AffiliateRanking | "all")}
              >
                {f === "all" ? "Todos" : f === "Ativo" ? "Ativos" : f}
              </button>
            ))}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Afiliado</th>
              <th>Ranking <InfoTooltip text={RANKING_TOOLTIP} /></th>
              <th style={{ textAlign: "right" }}>Gross</th>
              <th style={{ textAlign: "right" }}>Earnings</th>
              <th style={{ textAlign: "right" }}>Valor Líquido</th>
              <th style={{ textAlign: "right" }}>Vendas</th>
              <th style={{ textAlign: "right" }}>Ticket Médio</th>
              <th style={{ textAlign: "right" }}>CPA Médio</th>
              <th style={{ textAlign: "right" }}>Margem %</th>
              <th style={{ textAlign: "right" }}>Refund+CB %</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredAffiliates.length === 0 ? (
              <tr>
                <td colSpan={12} className="aff-filter-empty">
                  {statusFilter === "Inativo"
                    ? "Nenhum afiliado inativo no período."
                    : statusFilter === "Em Rampa"
                    ? "Nenhum afiliado em rampa no período."
                    : "Nenhum afiliado encontrado."}
                </td>
              </tr>
            ) : (
              filteredAffiliates.map((a, i) => {
                const margemColor = a.margem >= 10 ? "green" : a.margem >= 5 ? "orange" : "red";
                const rankingInfo = rankings.get(a.name);
                const ranking: AffiliateRanking = rankingInfo?.ranking ?? "Inativo";
                const isSelected = selectedAffiliate === a.name;

                return (
                  <tr
                    key={a.name}
                    className={`aff-table-row-clickable${isSelected ? " selected" : ""}`}
                    onClick={() => setSelectedAffiliate(isSelected ? null : a.name)}
                  >
                    <td style={{ color: "var(--text-3)", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>
                      {a.name}
                      {ranking === "Inativo" && rankingInfo?.lastFrontSaleDate && (
                        <div className="aff-last-sale">
                          Última venda: {formatDaysAgo(rankingInfo.lastFrontSaleDate)}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`tier-badge ${RANKING_CLASS[ranking]}`}>
                        {RANKING_LABEL[ranking]}
                      </span>
                    </td>
                    <td className="num green">{formatEur(a.gross)}</td>
                    <td className="num">{formatEur(a.earnings)}</td>
                    <td className={`num ${a.valorLiq < 0 ? "red" : "green"}`}>{formatEur(a.valorLiq)}</td>
                    <td className="num">{formatInt(a.sales)}</td>
                    <td className="num">{formatEur(a.aov)}</td>
                    <td className="num">{formatEur(a.cpa)}</td>
                    <td className={`num ${margemColor}`}>{formatPct(a.margem)}</td>
                    <td className={`num ${a.refundCbPct > 8 ? "red" : a.refundCbPct > 0 ? "orange" : ""}`}>
                      {formatPct(a.refundCbPct)}
                    </td>
                    <td>
                      <span className={`status-badge ${a.status.toLowerCase()}`}>{a.status}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Legends */}
      <div className="status-legend">
        <span className="status-legend-item"><span className="tier-badge tier-1">Tier 1</span> ≥€15k/dia · 3 dias seguidos + 3 de 4</span>
        <span className="status-legend-item"><span className="tier-badge tier-2">Tier 2</span> ≥€5k/dia · 3 dias seguidos + 3 de 4</span>
        <span className="status-legend-item"><span className="tier-badge tier-3">Tier 3</span> ≥€1k/dia · 3 dias seguidos + 3 de 4</span>
        <span className="status-legend-item"><span className="tier-badge tier-ativo">Ativo</span> ≥10 vendas em 7 dias</span>
        <span className="status-legend-item"><span className="tier-badge tier-em-rampa">Em Rampa</span> 1–9 vendas em 7 dias</span>
        <span className="status-legend-item"><span className="tier-badge tier-inativo">Inativo</span> 0 vendas em 7 dias</span>
      </div>
      <div className="status-legend">
        <span className="status-legend-item"><span className="status-badge scale">Scale</span> Meta superada — candidato a aumento de CPA</span>
        <span className="status-legend-item"><span className="status-badge watch">Watch</span> Dentro da meta, mas com indicadores a monitorar</span>
        <span className="status-legend-item"><span className="status-badge probation">Probation</span> Abaixo da meta — requer atenção</span>
      </div>

      <div className="footer">AFFILIVIEW by OG GROUP · 2026</div>

      {/* Sidebar drawer */}
      <AffiliateDrawer
        affiliate={drawerAffiliate}
        rankingInfo={drawerRanking}
        onClose={() => setSelectedAffiliate(null)}
      />
    </>
  );
};

export default AffiliatesPage;
