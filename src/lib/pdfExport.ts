import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  PeriodMetrics,
  AffiliateRow,
  AffiliateRankingInfo,
} from "./transactions";
import { formatEur, formatPct, formatInt } from "./transactions";

// ─── Colors ──────────────────────────────────────────────────────────────────
const BRAND = [15, 23, 42] as const;       // slate-900
const ACCENT = [34, 197, 94] as const;     // green-500
const MUTED = [100, 116, 139] as const;    // slate-500
const TABLE_HEAD = [30, 41, 59] as const;  // slate-800

interface ExportOptions {
  metrics: PeriodMetrics;
  affiliates: AffiliateRow[];
  rankings: Map<string, AffiliateRankingInfo>;
  periodLabel: string;
  activosCount: number;
  emRampaCount: number;
  inativoCount: number;
}

export function generateKPIReport(opts: ExportOptions): void {
  const {
    metrics,
    affiliates,
    rankings,
    periodLabel,
    activosCount,
    emRampaCount,
    inativoCount,
  } = opts;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;

  // ── Header ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageW, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("AFFILIVIEW", 14, 14);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório de KPIs", 14, 21);

  doc.setFontSize(9);
  doc.text(`Período: ${periodLabel}`, 14, 27);

  const now = new Date();
  doc.text(
    `Gerado em: ${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    pageW - 14,
    27,
    { align: "right" }
  );

  y = 40;

  // ── KPI Cards ──────────────────────────────────────────────────────────────
  doc.setTextColor(...BRAND);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Receita", 14, y);
  y += 3;

  const revenueKPIs = [
    { label: "Gross Revenue", value: formatEur(metrics.gross) },
    { label: "Earnings", value: formatEur(metrics.earnings) },
    { label: "Valor Líquido", value: formatEur(metrics.valorLiq) },
    { label: "Ticket Médio (AOV)", value: formatEur(metrics.aov) },
    { label: "Reembolso + CB", value: formatPct(metrics.refundCbPct) },
  ];

  y = drawKPIRow(doc, revenueKPIs, y, pageW);
  y += 6;

  doc.setTextColor(...BRAND);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Atividade", 14, y);
  y += 3;

  const activityKPIs = [
    { label: "Vendas Totais", value: formatInt(metrics.sales) },
    { label: "Ativados ≥ €2K", value: formatInt(metrics.activated) },
    { label: "Novos Qualificados", value: formatInt(metrics.novosQualificados) },
    { label: "Afiliados Ativos", value: formatInt(activosCount) },
    { label: "Inativos", value: formatInt(inativoCount) },
  ];

  y = drawKPIRow(doc, activityKPIs, y, pageW);
  y += 4;

  // Breakdown line
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...MUTED);
  doc.text(
    `Ativos: ${activosCount} · Em Rampa: ${emRampaCount} · Inativos: ${inativoCount}`,
    14,
    y
  );
  y += 8;

  // ── Top Afiliados Table ────────────────────────────────────────────────────
  doc.setTextColor(...BRAND);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Top Afiliados", 14, y);
  y += 2;

  const affRows = affiliates.slice(0, 15).map((a) => {
    const rank = rankings.get(a.name);
    return [
      a.name,
      rank?.ranking ?? "-",
      formatEur(a.gross),
      formatEur(a.earnings),
      formatInt(a.sales),
      formatPct(a.refundCbPct),
      formatEur(a.aov),
      a.status,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["Afiliado", "Ranking", "Gross", "Earnings", "Vendas", "Refund%", "AOV", "Status"]],
    body: affRows,
    theme: "grid",
    headStyles: {
      fillColor: [...TABLE_HEAD],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 7.5, textColor: [...BRAND] },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    margin: { left: 14, right: 14 },
    styles: { cellPadding: 2 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // ── Reembolso por Produto ──────────────────────────────────────────────────
  if (y > 240) { doc.addPage(); y = 15; }

  doc.setTextColor(...BRAND);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Reembolso por Produto", 14, y);
  y += 2;

  const refundRows = metrics.refundByProduct.map((r) => [
    r.name,
    formatPct(r.refundPct),
    formatEur(r.refundAmt),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Produto", "Taxa Reembolso", "Valor Reembolso"]],
    body: refundRows,
    theme: "grid",
    headStyles: {
      fillColor: [...TABLE_HEAD],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 8, textColor: [...BRAND] },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    margin: { left: 14, right: 14 },
    styles: { cellPadding: 2 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // ── Performance por Produto ────────────────────────────────────────────────
  if (y > 200) { doc.addPage(); y = 15; }

  doc.setTextColor(...BRAND);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Performance por Produto — Front", 14, y);
  y += 2;

  const prodRows = metrics.productSummary.map((p) => [
    p.product,
    formatEur(p.grossRevenue),
    formatEur(p.earnings),
    formatInt(p.frontSales),
    formatEur(p.aov),
    formatPct(p.returnPct),
    formatPct(p.cbPct),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Produto", "Gross", "Earnings", "Vendas Front", "AOV", "Refund%", "CB%"]],
    body: prodRows,
    theme: "grid",
    headStyles: {
      fillColor: [...TABLE_HEAD],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 7.5, textColor: [...BRAND] },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    margin: { left: 14, right: 14 },
    styles: { cellPadding: 2 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // ── Bundle Performance ─────────────────────────────────────────────────────
  if (metrics.bundlePerformance.length > 0) {
    if (y > 200) { doc.addPage(); y = 15; }

    doc.setTextColor(...BRAND);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Performance por Bundle", 14, y);
    y += 2;

    const bundleRows = metrics.bundlePerformance.map((b) => [
      b.bundle,
      b.product,
      formatInt(b.vendas),
      formatEur(b.gross),
      formatEur(b.valorLiqTotal),
      formatPct(b.refundPct),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Bundle", "Produto", "Vendas", "Gross", "Valor Líq (Total)", "Refund%"]],
      body: bundleRows,
      theme: "grid",
      headStyles: {
        fillColor: [...TABLE_HEAD],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: "bold",
      },
      bodyStyles: { fontSize: 7.5, textColor: [...BRAND] },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      margin: { left: 14, right: 14 },
      styles: { cellPadding: 2 },
    });
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("AFFILIVIEW by OG GROUP", 14, ph - 8);
    doc.text(`Página ${i}/${totalPages}`, pageW - 14, ph - 8, { align: "right" });
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  const dateStr = now.toISOString().slice(0, 10);
  doc.save(`affiliview-kpis-${dateStr}.pdf`);
}

// ─── KPI Row Drawing ─────────────────────────────────────────────────────────
function drawKPIRow(
  doc: jsPDF,
  kpis: { label: string; value: string }[],
  startY: number,
  pageW: number
): number {
  const margin = 14;
  const gap = 4;
  const usable = pageW - margin * 2;
  const cardW = (usable - gap * (kpis.length - 1)) / kpis.length;
  const cardH = 16;
  const y = startY + 2;

  kpis.forEach((kpi, i) => {
    const x = margin + i * (cardW + gap);

    // Card background
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, "F");

    // Label
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(kpi.label, x + 3, y + 5);

    // Value
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...ACCENT);
    doc.text(kpi.value, x + 3, y + 12);
  });

  return y + cardH;
}
