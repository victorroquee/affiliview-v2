-- Reconciliação semanal de payout Digistore24 (entrada manual por sexta de saque).
-- Uma linha por sexta (payout_date): valor Net real da Digistore + invoice ShipOffers.
-- O Transfer Amount e a anomalia são computados no cliente (ver src/lib/payout.ts).
--
-- Aplicada no projeto Supabase `affiliview` (ref fqhhmxnojtjwbliblyih) em 2026-07-08.
-- Consumida por src/hooks/usePayoutReconciliation.ts (padrão de useSettings).

create table if not exists public.payout_reconciliation (
  payout_date        date primary key,          -- sexta de saque (YYYY-MM-DD)
  real_net_amount    numeric,                    -- Net Amount real pago pela Digistore (EUR)
  shipoffers_invoice numeric,                    -- invoice ShipOffers da semana (EUR)
  notes              text,
  updated_at         timestamptz not null default now()
);

alter table public.payout_reconciliation enable row level security;

-- RLS restrita ao papel `authenticated` (não expõe ao `anon`, diferente do
-- padrão USING(true) para todos de app_settings). O linter do Supabase ainda
-- marca WITH CHECK(true)/USING(true) como permissivo — o endurecimento final é
-- uma allow-list por e-mail do operador (auditoria item #1 / #19), compartilhada
-- com app_settings, a ser aplicada quando a identidade de auth for confirmada.
create policy "recon_select_authenticated"
  on public.payout_reconciliation for select to authenticated using (true);
create policy "recon_insert_authenticated"
  on public.payout_reconciliation for insert to authenticated with check (true);
create policy "recon_update_authenticated"
  on public.payout_reconciliation for update to authenticated using (true) with check (true);
create policy "recon_delete_authenticated"
  on public.payout_reconciliation for delete to authenticated using (true);
