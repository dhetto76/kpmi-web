import { useFetcher } from "react-router";
import { Check, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "member" | "business";

/**
 * Approve / reject buttons for a member or business row.
 *
 * A fetcher, not a `<Form>`: these submit from inside a table row and must not
 * navigate. Each row gets its own fetcher, so one row's pending state and
 * error do not bleed into the others — which is what `useTransition` gave the
 * Next.js version for free.
 */
export function StatusControl({
  kind,
  id,
  status,
}: {
  kind: Kind;
  id: string;
  status: string;
}) {
  const fetcher = useFetcher<{ error?: string }>();
  const pending = fetcher.state !== "idle";
  const error = fetcher.data?.error;

  const button = (next: string, title: string, className: string, icon: React.ReactNode) => (
    <button
      type="submit"
      name="status"
      value={next}
      disabled={pending}
      title={title}
      className={className}
    >
      {icon}
    </button>
  );

  return (
    <div className="space-y-1">
      <fetcher.Form method="post" className="flex items-center gap-1.5">
        <input type="hidden" name="intent" value={`set-${kind}-status`} />
        <input type="hidden" name="id" value={id} />

        {status !== "approved" &&
          button(
            "approved",
            "Setujui",
            "rounded-lg bg-green-50 p-2 text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50",
            <Check size={15} />,
          )}
        {status !== "rejected" &&
          button(
            "rejected",
            "Tolak",
            "rounded-lg bg-red-50 p-2 text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50",
            <X size={15} />,
          )}
        {status !== "pending" &&
          button(
            "pending",
            "Kembalikan ke menunggu",
            "rounded-lg bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-50",
            <RotateCcw size={15} />,
          )}
      </fetcher.Form>

      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

/** Publish toggle for a product row. */
export function PublishToggle({
  id,
  isPublished,
}: {
  id: string;
  isPublished: boolean;
}) {
  const fetcher = useFetcher();
  const pending = fetcher.state !== "idle";

  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value="set-product-published" />
      <input type="hidden" name="id" value={id} />
      {/* The desired next state, so a double submit is idempotent. */}
      <input type="hidden" name="is_published" value={String(!isPublished)} />
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "rounded-full px-3 py-1 text-xs font-bold transition-colors disabled:opacity-50",
          isPublished
            ? "bg-green-50 text-green-700 hover:bg-green-100"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200",
        )}
      >
        {isPublished ? "Publik" : "Draf"}
      </button>
    </fetcher.Form>
  );
}
