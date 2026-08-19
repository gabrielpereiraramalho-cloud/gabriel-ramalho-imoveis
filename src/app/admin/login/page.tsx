import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const NOTICES: Record<string, string> = {
  not_admin: "Usuário sem permissão de administrador.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const notice = error ? NOTICES[error] : undefined;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-xl font-semibold tracking-tight">
        Painel Administrativo
      </h1>
      <LoginForm notice={notice} />
    </main>
  );
}
