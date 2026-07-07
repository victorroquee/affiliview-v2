import React, { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

function agoLabel(iso: string | null, now: number): string {
  if (!iso) return "—";
  const min = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (min <= 0) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

interface Props {
  refreshing: boolean;
  lastFetched: string | null;
  error: string | null;
  onRefresh: () => void;
}

/** Status de atualização estilo WHOOP: ponto amarelo pulsante enquanto busca em background. */
const RefreshStatus: React.FC<Props> = ({ refreshing, lastFetched, error, onRefresh }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const state = error ? "err" : refreshing ? "busy" : "ok";
  return (
    <button
      className={`refresh-status ${state}`}
      onClick={onRefresh}
      disabled={refreshing}
      title={error ? `Erro: ${error} — clique para tentar de novo` : "Atualizar dados agora"}
    >
      <span className="refresh-dot" />
      <RefreshCw size={12} strokeWidth={1.9} className={refreshing ? "spin" : ""} />
      <span className="refresh-label">
        {error ? "Erro ao atualizar" : refreshing ? "Atualizando…" : `Atualizado ${agoLabel(lastFetched, now)}`}
      </span>
    </button>
  );
};

export default RefreshStatus;
