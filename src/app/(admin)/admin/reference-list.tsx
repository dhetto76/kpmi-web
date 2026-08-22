"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Pencil, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReferenceKind, ReferenceValue } from "@/lib/settings";
import {
  createReferenceValue,
  deleteReferenceValue,
  renameReferenceValue,
  setReferenceValueActive,
} from "./settings-actions";

/**
 * Editor for one reference list (korwil, kategori produk, or industri).
 *
 * All three lists are identical in shape, so they share this component and
 * differ only in labels and the usage counts passed in.
 *
 * Read-only for anyone but a super admin: a korwil admin can see which regions
 * exist but not edit the list that defines their own scope. The actions refuse
 * them regardless — this only avoids showing controls that cannot work.
 */
export function ReferenceList({
  kind,
  values,
  usage,
  title,
  singular,
  canEdit,
}: {
  kind: ReferenceKind;
  values: ReferenceValue[];
  /** Row id -> number of records using it, for the "dipakai" hint. */
  usage: Record<string, number>;
  title: string;
  singular: string;
  canEdit: boolean;
}) {
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Placeholder rows have no id: the table was unreachable and these came from
  // the hard-coded fallback, so there is nothing to edit.
  const isFallback = values.length > 0 && values.every((value) => !value.id);

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("id");
    if (!term) return values;
    return values.filter((value) => value.name.toLocaleLowerCase("id").includes(term));
  }, [values, query]);

  const activeCount = values.filter((value) => value.is_active).length;

  function reset() {
    setError(null);
    setMessage(null);
    setConfirmingId(null);
  }

  function run(action: () => Promise<{ error: string } | { success: true }>, done?: () => void) {
    reset();
    startTransition(async () => {
      const result = await action();
      if ("error" in result) setError(result.error);
      else done?.();
    });
  }

  function add() {
    const name = newName.trim();
    if (!name) return;
    run(
      () => createReferenceValue(kind, name),
      () => {
        setNewName("");
        setMessage(`"${name}" ditambahkan.`);
      },
    );
  }

  function saveRename(id: string) {
    const name = editValue.trim();
    run(
      () => renameReferenceValue(id, name),
      () => {
        setEditingId(null);
        setMessage("Nama diperbarui beserta data lama yang memakainya.");
      },
    );
  }

  return (
    <div className="space-y-4">
      {isFallback && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Daftar ini masih memakai data bawaan aplikasi. Jalankan migrasi
          <code className="mx-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs">
            20260822000004_reference_values_and_settings.sql
          </code>
          agar dapat diubah dari halaman ini.
        </p>
      )}

      {canEdit && !isFallback && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-500">
            Tambah {singular}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  add();
                }
              }}
              placeholder={`Nama ${singular} baru…`}
              maxLength={80}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-maroon-600"
            />
            <button
              type="button"
              onClick={add}
              disabled={pending || newName.trim().length < 2}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-maroon-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-maroon-700 disabled:opacity-50"
            >
              <Plus size={16} /> Tambah
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {message}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Cari ${title.toLocaleLowerCase("id")}…`}
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-maroon-600"
          />
        </div>
        <p className="text-sm text-gray-500">
          <span className="font-bold text-gray-700">{activeCount}</span> aktif
          {values.length !== activeCount && ` · ${values.length - activeCount} nonaktif`}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Dipakai</th>
              <th className="px-4 py-3">Status</th>
              {canEdit && <th className="px-4 py-3 text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 4 : 3} className="px-4 py-10 text-center text-gray-500">
                  Tidak ada {singular} yang cocok.
                </td>
              </tr>
            )}

            {visible.map((value) => {
              const editing = editingId === value.id;
              const used = usage[value.id] ?? 0;

              return (
                <tr key={value.id || value.name} className={cn(!value.is_active && "bg-gray-50/60")}>
                  <td className="px-4 py-3">
                    {editing ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(event) => setEditValue(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") saveRename(value.id);
                            if (event.key === "Escape") setEditingId(null);
                          }}
                          maxLength={80}
                          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-maroon-600"
                        />
                        <button
                          type="button"
                          onClick={() => saveRename(value.id)}
                          disabled={pending}
                          title="Simpan"
                          className="rounded-lg bg-green-50 p-2 text-green-700 hover:bg-green-100 disabled:opacity-50"
                        >
                          <Check size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <span
                        className={cn(
                          "font-semibold",
                          value.is_active ? "text-gray-900" : "text-gray-400 line-through",
                        )}
                      >
                        {value.name}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 tabular-nums text-gray-600">{used}</td>

                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-3 py-1 text-xs font-bold",
                        value.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-600",
                      )}
                    >
                      {value.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>

                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {!editing && (
                          <button
                            type="button"
                            onClick={() => {
                              reset();
                              setEditingId(value.id);
                              setEditValue(value.name);
                            }}
                            title="Ubah nama"
                            className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
                          >
                            <Pencil size={15} />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            run(() => setReferenceValueActive(value.id, !value.is_active))
                          }
                          disabled={pending}
                          title={value.is_active ? "Nonaktifkan" : "Aktifkan kembali"}
                          className={cn(
                            "rounded-lg p-2 disabled:opacity-50",
                            value.is_active
                              ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                              : "bg-green-50 text-green-700 hover:bg-green-100",
                          )}
                        >
                          {value.is_active ? <X size={15} /> : <RotateCcw size={15} />}
                        </button>

                        {confirmingId === value.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                run(
                                  () => deleteReferenceValue(value.id),
                                  () => setMessage(`"${value.name}" dihapus.`),
                                )
                              }
                              disabled={pending}
                              className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              Hapus
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingId(null)}
                              className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              reset();
                              setConfirmingId(value.id);
                            }}
                            disabled={pending || used > 0}
                            title={
                              used > 0
                                ? "Masih dipakai — nonaktifkan saja"
                                : "Hapus permanen"
                            }
                            className="rounded-lg bg-red-50 p-2 text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!canEdit && (
        <p className="text-sm text-gray-500">
          Hanya Super Admin yang dapat mengubah daftar ini.
        </p>
      )}
    </div>
  );
}
