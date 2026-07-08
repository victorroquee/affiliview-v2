# Auditoria Consolidada — AffiliView-v3

**Stack:** React/TypeScript/Vite + Supabase · Gestão de afiliados/CPA
**Escopo:** achados confirmados por verificação adversarial (severidade = ajustada pelo verificador)
**Data:** 2026-07-08
**Método:** auditoria multi-agente — 6 agentes por área → verificação adversarial de cada achado → síntese. 40 subagentes, 33 achados brutos → 28 confirmados, 5 refutados.

## Baseline objetivo
- **Testes:** 130 passando / 14 arquivos (vitest) ✅
- **Lint:** `npm run lint` **falha** — erros `react-hooks/set-state-in-effect` + 1 erro rígido `react-hooks/refs` em `AffiliateDrawer.tsx:75` (ver item 21)

## Panorama de severidade (ajustada)
| Severidade | Qtd |
|---|---|
| Crítico | 0 |
| Alto | 1 |
| Médio | 8 |
| Baixo | 18 |
| **Total** | **27** |

Nota de contexto: o app opera corretamente no caminho padrão (EUR, pt-BR, payload Digistore em dot-decimal e ISO-2). Quase todos os defeitos financeiros só se materializam fora desse caminho — país não mapeado, moeda ≠ EUR, idioma inglês, margem-alvo ≠ 0, ou dados malformados. O ledger EUR persistido não é corrompido por nenhum achado; a maioria é de exibição, conferência ou robustez latente. O risco de segurança é a exceção que exige ação imediata.

---

## 🔴 Alto (1)

### 1. Proxy `/api/digistore` autentica mas NÃO autoriza
**Arquivo:** `api/digistore.ts:31-51, 64-67`
**Descrição:** `isAuthenticated()` termina em `return r.ok;` — autoriza qualquer token que faça GET `/auth/v1/user` retornar 200, sem allow-list de user id/email. É o único gate protegendo o histórico financeiro completo do vendor (o front força `role=vendor` e `transaction_type=payment,refund,chargeback`).
**Impacto:** Confidencialidade total. A anon key é pública (versionada em `.env.example`) e o signup por e-mail está habilitado (`disable_signup=false` confirmado), então um estranho pode `signUp()` direto contra o projeto, confirmar o próprio e-mail, obter access_token válido e ler todo o faturamento/CPA/comissões/refunds/chargebacks. Mesmo com signup desligado, o design confunde autenticação com autorização — qualquer segundo usuário herdaria acesso total.
**Correção:** Após validar o token, comparar `user.email`/`user.id` contra uma allow-list em env (ex.: `ALLOWED_USER_EMAILS`) e rejeitar com 403. Em paralelo: desabilitar signups públicos no Supabase Auth e/ou restringir por domínio.

---

## 🟠 Médio (8)

### 2. COGS de venda frontal zerado quando o país está fora do `COUNTRY_ZONE`
**Arquivo:** `src/lib/costTable.ts:220-222`; `src/lib/transactions.ts:643-648`
**Descrição:** `getFulfillmentBreakdown()` retorna tudo zerado quando a zona não resolve — mas o custo de produto **independe de zona**. O loop de upsells cobra o produto sem checar zona, criando assimetria: mesmo produto/país custeado no upsell e zerado no front.
**Impacto:** País vazio (`''`), 3-letras ('DEU'), ou fora do mapa (US/BR) dropa silenciosamente todo o COGS frontal, superestimando Valor Líquido, netProfit por afiliado, margem e a reconciliação. Um pedido de 6 frascos move ~€45 de COGS para o lucro. Direção do erro é sempre a favor do lucro.
**Correção:** Sempre cobrar `product = bottles * getProductCostPerBottle`, degradando apenas shipping/packaging/processing quando a zona não resolve, com log para expor países não mapeados.

### 3. Drawer do Dashboard exibe métricas de período ANTIGO
**Arquivo:** `src/pages/Dashboard.tsx:37-39, 145`
**Descrição:** O drawer guarda um snapshot congelado do `AffiliateRow` e o único reset é `useEffect(..., [periodDays])`. Dois ranges custom de mesma duração (01–07 vs 08–14/jul) não disparam reset; refresh com o drawer aberto também congela o snapshot enquanto os Upsells recalculam para o novo período.
**Impacto:** Usuário vê KPIs financeiros de um afiliado atribuídos ao período errado, sem aviso — pode decidir CPA/comissão sobre gross/margem de outra semana.
**Correção:** Armazenar o **nome** do afiliado e re-derivar o `AffiliateRow` a cada render (padrão de `Affiliates.tsx:151`), ou usar `activeDateFrom`/`activeDateTo` como chave de reset.

### 4. `parseReal` do Payout corrompe valores com ponto decimal (~100x)
**Arquivo:** `src/pages/Payout.tsx:15-19`
**Descrição:** Remove todos os pontos como separador de milhar: '294.50'→29450, '0.05'→5, '1,234.56'→1.23456. Funciona só para comma-decimal (pt-BR/de-DE).
**Impacto:** Em modo USD (en-US), o app renderiza '$294.50' e o usuário digitando o valor exibido gera delta falso. Quebra a conferência centavo-a-centavo para USD/en; default EUR/pt-BR não é afetado.
**Correção:** Parse ciente do locale (`settings.language`); se houver só ponto, tratar como decimal; preservar o sinal.

### 5. Margem-alvo subtraída como euro absoluto mas rotulada como porcentagem
**Arquivo:** `src/lib/cpa/analyzeCPA.ts:144` (idem `useCpaVariavel.ts:100`)
**Descrição:** `maxCpaRaw = cpaDefault + ltvProfit − marginTarget` trata `marginTarget` como euros (sem `/100`). Mas a UI apresenta % em três lugares divergentes (`ConferenciaCPA:47` "{margin}%", slider 0-50%, tooltip "LTV × (1 − margem/100)").
**Impacto:** Escolher 15% subtrai €15 fixos, não 15%, distorcendo CPA máximo e badges over/watch/ok. Default 0 mascara; só manifesta em input não-zero.
**Correção:** Unificar a semântica (% ou €) entre código, label, slider e tooltip. Cobrir com teste.

### 6. Conferência de CPA marca "Acima do teto" falsamente para afiliados fora do modelo
**Arquivo:** `src/pages/ConferenciaCPA.tsx:31-33`
**Descrição:** Para um afiliado só com M4/SKU novo (ignorado por `analyzeCPA`), `maxByAff.get(a.name)` é undefined → `??0` → maxCpa=0 → folga=-cpa<0 → status 'over'.
**Impacto:** Afiliado sem teto calculado aparece no topo como "Acima do teto" e infla o `overCount` do banner — alerta de reconciliação falso que pode motivar ação indevida.
**Correção:** Se `maxByAff.get` for undefined, exibir "sem-modelo" e excluir do overCount.

### 7. Valor Real do Payout não persiste e compara EUR contra colunas convertidas
**Arquivo:** `src/pages/Payout.tsx:22, 104-124`
**Descrição:** Valores digitados vivem só em `useState` local (some ao trocar aba/moeda/refresh — App keya por `currency-language`). `expectedPayout` e thresholds (0.01/1) estão em EUR, mas a coluna Esperado usa `formatEur` (×taxa ativa).
**Impacto:** Reconciliação semanal perdida ao navegar. Em moeda ≠ EUR, o delta só bate digitando EUR. Default EUR/rate=1 mascara.
**Correção:** Persistir valores (localStorage/Supabase); converter `expectedPayout` para a moeda ativa antes de comparar.

### 8. Troca de idioma para inglês só afeta 3 telas — resto fica em PT hardcoded
**Arquivo:** `src/pages/Payout.tsx:85` (e Affiliates, CpaFixo, CpaVariavel, CustosOperacionais, Produtos, ConferenciaCPA, ConferenciaVL, MailSales, Login + maioria dos componentes)
**Descrição:** A infra i18n só é consumida por `Sidebar`, `Dashboard` e `Settings`. Todas as demais telas renderizam strings PT fixas.
**Impacto:** Ao selecionar English, 3 telas em inglês e todo o resto em português — tradução parcial. Sem impacto em cálculo/dados; gap de feature.
**Correção:** Encaminhar strings por `t()` e adicionar chaves aos dicionários, ou documentar que apenas 3 telas são internacionalizadas.

### 9. `Delta` descarta sinal negativo em EUR e hardcoda o símbolo €
**Arquivo:** `src/components/cpa/Delta.tsx:16-20`
**Descrição:** `sign = value>0?'+':''` — negativos ficam sem sinal e o ramo euro usa `Math.abs`, então -3 vira "€3.00" (só a cor diferencia). Símbolo € fixo ignora a moeda ativa.
**Impacto:** roomAboveCurrent, cpaDelta e vsOpLtvProfit (frequentemente negativos) exibem magnitude com sinal trocado, sobrevivendo só pela cor. Em BRL/USD mostra "€" e valor não convertido.
**Correção:** `sign = value>0?'+':value<0?'-':''`; `Math.abs` nos dois ramos; usar `formatMoney` no lugar do € fixo.

---

## 🟡 Baixo (18)

10. **`currency` da Digistore descartado no normalizer** (`digiNormalizer.ts:32,155-177`) — não-EUR seria somado como EUR sem conversão. Robustez latente (base é EUR por design).
11. **`analyzeCPA`: refunds de M4/sem-variante reduzem netProfit e inflam refundRate** (`analyzeCPA.ts:72,96-101,176-181`) — numerador com estornos ausentes do denominador.
12. **`parseMoney` trunca decimais com vírgula negativos e milhares US** (`digiNormalizer.ts:61-78`) — latente; API live é dot-decimal (reconcilia ao centavo em 981 tx).
13. **Filtro `refund_request` case-sensitive** (`digiNormalizer.ts:183-188`) — 'Refund_Request' vira registro fantasma no cache. Zero impacto financeiro.
14. **`upsell_no` NaN infla gross sem gerar COGS** (`digiNormalizer.ts:152`) — dado malformado escapa de front e upsell.
15. **Clawback de CPA em refund/chargeback ignorado** (`transactions.ts:942 vs 956-968`) — CPA por afiliado superestimado se comissão for estornada.
16. **productSummary: netRevenue ignora refunds de upsell embora gross os inclua** (`transactions.ts:805-839`) — lucro por produto levemente superestimado.
17. **Cotação FX vencida usada como fresca** (`settingsStore.ts:60-69`; `useSettings.tsx:152-169`) — `fxTriedRef` nunca reseta; falha transitória mantém taxa vencida por toda a sessão (só BRL/USD).
18. **Histórico financeiro/tokens persistem em localStorage e não são limpos no signOut** (`useAuth.tsx:41-43`) — próximo usuário/XSS lê cache pós-logout.
19. **RLS de `app_settings` permissiva (USING(true))** (`useSettings.tsx:104-116`) — qualquer authenticated sobrescreve currency/fx compartilhados.
20. **Token revalidado por round-trip a cada página** (`useDigistoreAPI.ts:70-105`; `api/digistore.ts:41`) — latência/rate-limit; mitigado por PAGE_DELAY_MS.
21. **`AffiliateDrawer` escreve ref durante o render** (`AffiliateDrawer.tsx:74-75`) — erro rígido que **quebra `npm run lint`**. Zero impacto funcional.
22. **Filtro de produto em Produtos não reseta ao trocar período** (`Produtos.tsx:19,30-38`) — tabelas vazias sem empty-state.
23. **`fetchedRef` nunca reseta: sem refetch após troca de sessão** (`App.tsx:54,63-67`) — rows da sessão anterior seguem em memória.
24. **Agrupamento de milhar segue locale da MOEDA, não do idioma** (`transactions.ts:1076-1084`) — inconsistência só em en+EUR.
25. **Rótulo USD hardcoded em PT ("Dólar ($)")** (`settingsStore.ts:24`) — cosmético, só em Settings.
26. **Limiares em € nos labels do Dashboard não convertidos em BRL/USD** (`i18n/pt.ts:46-49`) — indicar que é limiar EUR-fixo.
27. **Update otimista com stale-closure no `useSettings`** (`useSettings.tsx:112-126`) — persist lento pode reverter snapshot obsoleto.
28. **Tooltip diz refundRate "count-based" mas cálculo é amount-based** (`AffiliateDetail.tsx:69,88`) — texto enganoso; número correto.

---

## Atualização 2026-07-08 — resolvidos na branch `feat/costs-payout-auth`

Ao implementar o módulo de Payout & Reconciliação (relatório de alinhamento §3.3/§4.3/§7.1):

- **Item 7 (Valor Real do Payout não persiste)** — ✅ resolvido: valores manuais (Real Net + invoice ShipOffers) agora persistem em Supabase (`payout_reconciliation`) por sexta, via `usePayoutReconciliation`. O Δ é computado em EUR (Esperado − Real, ambos EUR) e só o display converte — matemática do delta correta.
- **Item 4 (`parseReal` corrompe ponto decimal ~100x)** — ✅ resolvido: substituído por `parseNum` tolerante a formato ("50.357,93", "50357,93" e "50357.93").
- **Regra de reserva** — corrigido em `payout.ts`: os 10% incidem só sobre `vendor_share` positivo (relatório §2.1/§4.2). Não estava listado no audit, mas era divergência real de cálculo.
- **RLS (relacionado aos itens 1/19)** — a nova tabela usa RLS restrita a `authenticated` (não `anon`); o linter ainda marca as políticas de escrita como permissivas. Endurecimento pendente = allow-list por e-mail do operador, compartilhado com `app_settings`.

---

## Refutados (investigados e descartados)

1. **Parsing frágil do envelope** — campos são obrigatórios no contrato; view "Hoje" prova que períodos vazios retornam `[]`.
2. **Agregação por `affiliate_name`** — nickname é único/imutável no modelo Digistore24 (não há `affiliate_id` no payload).
3. **Timeline intradiária colapsa em 00h / UTC** — pipeline é UTC-consistente (`getUTCHours`); alegação de drift provadamente falsa, coberta por teste INTRA-04.
4. **Proxy não valida método/params** — chamada upstream é GET read-only fixa, allow-list de chaves, API key server-side. Defense-in-depth já neutralizado.
5. **Reset de drawer em Affiliates via setState-in-effect** — benigno: `Affiliates.tsx` guarda o NOME e re-deriva (linha 151), nunca mistura períodos. Contrasta com Dashboard (item 3), onde o mesmo padrão É load-bearing.
