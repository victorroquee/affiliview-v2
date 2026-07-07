import React, { useState } from "react";
import { LogIn, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const Login: React.FC = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    if (error) {
      setError(
        error.toLowerCase().includes("invalid")
          ? "E-mail ou senha inválidos."
          : error
      );
      setSubmitting(false);
    }
    // sucesso → onAuthStateChange atualiza a sessão e o App troca de tela
  };

  return (
    <div className="login-screen">
      <div className="login-aside">
        <img src="/og-logo.png" alt="OG Group" className="login-aside-logo" />
        <div className="login-aside-tag">OG GROUP</div>
        <h1 className="login-aside-title">AffiliView</h1>
        <p className="login-aside-sub">
          Inteligência de afiliados, custos e payout da operação Digistore24.
        </p>
        <div className="login-aside-foot">
          <ShieldCheck size={13} strokeWidth={1.6} /> Acesso restrito · dados financeiros
        </div>
      </div>

      <div className="login-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-mark">
            <LogIn size={18} strokeWidth={1.6} />
          </div>
          <h2 className="login-title">Entrar</h2>
          <p className="login-desc">Use suas credenciais para acessar o painel.</p>

          <label className="login-label" htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            className="login-input"
            type="email"
            autoComplete="username"
            placeholder="voce@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />

          <label className="login-label" htmlFor="login-password">Senha</label>
          <input
            id="login-password"
            className="login-input"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <div className="login-error">{error}</div>}

          <button className="login-btn" type="submit" disabled={submitting}>
            {submitting ? <Loader2 size={15} className="spin" strokeWidth={1.8} /> : <LogIn size={15} strokeWidth={1.8} />}
            {submitting ? "Entrando…" : "Entrar"}
          </button>

          <div className="login-foot">AFFILIVIEW by OG GROUP · 2026</div>
        </form>
      </div>
    </div>
  );
};

export default Login;
