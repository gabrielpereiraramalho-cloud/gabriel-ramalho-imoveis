"use client";

export function DeleteLeadButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          !confirm(
            "Tem certeza que deseja excluir este lead? Esta ação não poderá ser desfeita.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
      >
        Excluir
      </button>
    </form>
  );
}
