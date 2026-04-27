# Phase 8: Auditoria de Divergencia — Investigation Context

## Dados Observados (referencia: ontem)

### Painel Digistore24 (fonte oficial):
- Gross Amount: €14.110,76
- Net Amount: €13.125,74
- Your Earnings: €3.962,17

### AffiliView (nosso app):
- Gross Revenue: €12.227,00
- Earnings: €2.049,55
- Valor Liquido: €822,38
- Ticket Medio (AOV): €272,04
- Reembolso + Chargeback: 4,7%

## Diferencas Identificadas

| Metrica | Digistore24 | AffiliView | Diferenca |
|---|---|---|---|
| Gross Revenue | €14.110,76 | €12.227,00 | -€1.883,76 (-13,4%) |
| Earnings | €3.962,17 | €2.049,55 | -€1.912,62 (-48,3%) |
| Net Amount | €13.125,74 | €822,38 (Valor Liquido) | conceito diferente? |

## Hipoteses a Investigar

1. **Filtros de data e timezone** — Digistore24 usa UTC? AffiliView filtra pelo fuso correto?
2. **Escopo de transacoes** — Digistore inclui upsells, order bumps e renovacoes no gross? AffiliView exclui algum order_type?
3. **Status das transacoes** — Digistore exibe gross incluindo pending/on_hold ou apenas complete?
4. **Campo Earnings** — No Digistore "Your Earnings" e a comissao. No AffiliView mapeado para qual campo da API?
5. **Reembolsos e chargebacks** — Digistore ja desconta refunds do gross? AffiliView computa separadamente?
6. **Multiplos produtos** — AffiliView filtra por produto/campanha enquanto Digistore mostra total?
7. **Valor Liquido** — Representa lucro liquido (pos-COG + shipping) ou net amount da Digistore?
8. **Paginacao e limites de API** — API retornando todos os registros?
9. **Currency conversion** — Conversao de moeda indevida?
10. **Cache ou delay** — Dados de snapshot anterior?

## Objetivo

Identificar causa raiz da divergencia. NAO fazer alteracao de codigo. Mapear hipoteses, verificar documentacao da API, listar campos/funcoes do AffiliView a auditar.
