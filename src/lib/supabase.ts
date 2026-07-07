import { createClient } from "@supabase/supabase-js";

// Credenciais públicas (publishable/anon key) — seguras para o bundle do cliente.
// Definidas em .env.local (dev) e nas env vars da Vercel (produção).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  console.error(
    "[supabase] Variáveis ausentes: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY " +
    "em .env.local (e nas env vars da Vercel)."
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
