"use client";

import { useState } from "react";

interface Props {
  onAdd: (url: string) => Promise<void>;
}

export function AddLinkForm({ onAdd }: Props) {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      await onAdd(trimmed);
      setUrl("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste a link (LinkedIn post, article, essay...)"
        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-500"
        required
        disabled={submitting}
      />
      <button
        type="submit"
        disabled={submitting}
        className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-white disabled:opacity-50"
      >
        {submitting ? "Adding..." : "Add"}
      </button>
    </form>
  );
}
