import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

// Dados manuais de reconciliação por sexta de saque (persistidos no Supabase,
// tabela `payout_reconciliation`). Espelha o padrão otimista de useSettings.
export interface ReconEntry {
  realNet: number | null;    // Net Amount real pago pela Digistore na semana (EUR)
  shipOffers: number | null; // invoice ShipOffers da semana (EUR)
}

interface ReconRow {
  payout_date: string;
  real_net_amount: number | null;
  shipoffers_invoice: number | null;
}

export interface UsePayoutReconciliation {
  data: Record<string, ReconEntry>;               // keyed by payoutDate (YYYY-MM-DD)
  loading: boolean;
  saveError: string | null;
  save: (payoutDate: string, patch: Partial<ReconEntry>) => Promise<void>;
}

const EMPTY: ReconEntry = { realNet: null, shipOffers: null };

export function usePayoutReconciliation(): UsePayoutReconciliation {
  const { session } = useAuth();
  const [data, setData] = useState<Record<string, ReconEntry>>({});
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Espelho de `data` para o upsert ler a entrada mesclada sem stale-closure,
  // atualizado em effect (nunca durante o render — evita o lint refs-in-render).
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  // Carrega todas as linhas assim que houver sessão.
  useEffect(() => {
    if (!session) return;
    let active = true;
    (async () => {
      const { data: rows, error } = await supabase
        .from("payout_reconciliation")
        .select("payout_date, real_net_amount, shipoffers_invoice");
      if (!active) return;
      if (!error && rows) {
        const map: Record<string, ReconEntry> = {};
        for (const r of rows as ReconRow[]) {
          map[r.payout_date] = { realNet: r.real_net_amount, shipOffers: r.shipoffers_invoice };
        }
        setData(map);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [session]);

  const save = useCallback(async (payoutDate: string, patch: Partial<ReconEntry>) => {
    const merged: ReconEntry = { ...(dataRef.current[payoutDate] ?? EMPTY), ...patch };
    setData((prev) => ({ ...prev, [payoutDate]: merged }));   // otimista
    setSaveError(null);
    const { error } = await supabase.from("payout_reconciliation").upsert({
      payout_date: payoutDate,
      real_net_amount: merged.realNet,
      shipoffers_invoice: merged.shipOffers,
      updated_at: new Date().toISOString(),
    });
    if (error) setSaveError(error.message);
  }, []);

  return { data, loading, saveError, save };
}
