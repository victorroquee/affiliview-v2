import React from "react";
import { Loader2, AlertCircle, WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";

export interface ConnectionStatusProps {
  loading:     boolean;
  error:       string | null;
  lastFetched: string | null;
  onRefresh:   () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour:   "2-digit",
    minute: "2-digit",
  });
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  loading,
  error,
  lastFetched,
  onRefresh,
}) => {
  if (loading) {
    return (
      <div className="conn-status conn-status--loading">
        <Loader2 size={15} className="conn-spin" />
        <span>Buscando dados...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="conn-status conn-status--error">
        <AlertCircle size={15} />
        <span className="conn-message">{error}</span>
        <button className="conn-btn" onClick={onRefresh}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!lastFetched) {
    return (
      <div className="conn-status conn-status--idle">
        <WifiOff size={15} />
        <span>Nenhuma transação carregada</span>
        <button className="conn-btn" onClick={onRefresh}>
          Conectar
        </button>
      </div>
    );
  }

  return (
    <div className="conn-status conn-status--ok">
      <CheckCircle2 size={15} />
      <span>Atualizado às {formatTime(lastFetched)}</span>
      <button className="conn-btn conn-btn--refresh" onClick={onRefresh} title="Atualizar dados">
        <RefreshCw size={13} />
        Atualizar
      </button>
    </div>
  );
};

export default ConnectionStatus;
