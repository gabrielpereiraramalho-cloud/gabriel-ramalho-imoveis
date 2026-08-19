"use client";

export function DeleteButton({
  action,
  code,
}: {
  action: () => Promise<void>;
  code: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Excluir o imóvel ${code}? Esta ação é irreversível.`)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
      >
        Excluir
      </button>
    </form>
  );
}
