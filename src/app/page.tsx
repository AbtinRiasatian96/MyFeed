"use client";

import { useEffect, useState, useCallback } from "react";
import { AddLinkForm } from "@/components/AddLinkForm";
import { FeedItem } from "@/components/FeedItem";

interface ReadingItem {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  source: string | null;
  is_read: number;
  created_at: string;
  item_type: string;
  author: string | null;
  author_image: string | null;
  content: string | null;
}

type Filter = "all" | "unread" | "read";

export default function Home() {
  const [items, setItems] = useState<ReadingItem[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/items", { cache: "no-store" });
    const data = await res.json();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAdd = async (url: string) => {
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (res.ok) {
      await res.json();
      await fetchItems();
    }
  };

  const handleToggleRead = async (id: number) => {
    await fetch(`/api/items/${id}`, { method: "PATCH" });
    fetchItems();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    fetchItems();
  };

  const filtered = items.filter((item) => {
    if (filter === "unread") return item.is_read === 0;
    if (filter === "read") return item.is_read === 1;
    return true;
  });

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">MyFeed</h1>
      <p className="text-gray-400 mb-6">Your personal reading list</p>

      <AddLinkForm onAdd={handleAdd} />

      <div className="flex gap-2 mb-6">
        {(["all", "unread", "read"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-sm capitalize ${
              filter === f
                ? "bg-gray-100 text-gray-900"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">
          {filter === "all"
            ? "No items yet. Paste a link above to get started."
            : `No ${filter} items.`}
        </p>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <FeedItem
              key={item.id}
              item={item}
              onToggleRead={handleToggleRead}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </main>
  );
}
