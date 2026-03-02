"use client";

import { useState, useRef, useEffect } from "react";
import { updatePropertyNickname } from "./actions";

export function PropertyNickname({
  propertyId,
  initialNickname,
}: {
  propertyId: string;
  initialNickname: string | null;
}) {
  const [nickname, setNickname] = useState(initialNickname ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  async function save() {
    setEditing(false);
    const value = nickname.trim() || null;
    setSaving(true);
    await updatePropertyNickname(propertyId, value);
    setSaving(false);
  }

  return (
    <div className="mt-0.5">
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setNickname(initialNickname ?? "");
              setEditing(false);
            }
          }}
          placeholder="e.g. Rental Unit A"
          className="w-full max-w-sm rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-left text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-400"
        >
          {nickname.trim() ? nickname.trim() : "Add nickname"}
        </button>
      )}
      {saving && <span className="ml-2 text-xs text-zinc-400">Saving…</span>}
    </div>
  );
}
