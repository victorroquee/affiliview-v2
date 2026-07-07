import React from "react";
import { BarChart2 } from "lucide-react";
import LoadingDot from "./LoadingDot";

interface Props {
  loading: boolean;
  title?: string;
  hint?: string;
}

const EmptyState: React.FC<Props> = ({ loading, title, hint }) => (
  <div className="empty-state">
    <div className="empty-state-icon-row">
      <BarChart2 size={36} strokeWidth={1.4} />
      {loading && <LoadingDot />}
    </div>
    <h3>{loading ? "Carregando dados..." : (title ?? "Nenhum dado no período")}</h3>
    <p>{loading ? "Aguarde enquanto buscamos as transações da Digistore24." : (hint ?? "Selecione um período com transações ou amplie a janela.")}</p>
  </div>
);

export default EmptyState;
