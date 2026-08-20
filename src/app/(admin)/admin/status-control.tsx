"use client";

import { useTransition, useState } from "react";
import { Check, X, RotateCcw } from "lucide-react";
import { setMemberStatus, setBusinessStatus, setProductPublished } from "./actions";
import { cn } from "@/lib/utils";

type Kind = "member" | "business";

/** Approve / reject buttons for a member or business row. */
export function StatusControl({
  kind,
  id,
  status,
}: {
  kind: Kind;
  id: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function update(next: string) {
    setError(null);
    startTransition(async () => {
      const action = kind === "member" ? setMemberStatus : setBusinessStatus;
      const result = await action(id, next);
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      {status !== "approved" && (
        <button
          onClick={() => update("approved")}
          disabled={pending}
          title="Setujui"
          className="rounded-lg bg-green-50 p-2 text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50"
        >
          <Check size={15} />
        </button>
      )}
      {status !== "rejected" && (
        <button
          onClick={() => update("rejected")}
          disabled={pending}
          title="Tolak"
          className="rounded-lg bg-red-50 p-2 text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
        >
          <X size={15} />
        </button>
      )}
      {status !== "pending" && (
        <button
          onClick={() => update("pending")}
          disabled={pending}
          title="Kembalikan ke menunggu"
          className="rounded-lg bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-50"
        >
          <RotateCcw size={15} />
        </button>
      )}
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
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await setProductPublished(id, !isPublished);
        })
      }
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
  );
}
