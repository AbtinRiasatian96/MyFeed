"use client";

import { useState } from "react";

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

interface Props {
  item: ReadingItem;
  onToggleRead: (id: number) => void;
  onDelete: (id: number) => void;
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#0a66c2]">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-100">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function AuthorAvatar({ item }: { item: ReadingItem }) {
  if (item.author_image) {
    return (
      <img
        src={item.author_image}
        alt={item.author || ""}
        className="w-10 h-10 rounded-full object-cover"
      />
    );
  }
  // Fallback: initial letter circle
  const initial = item.author?.[0]?.toUpperCase() || "?";
  return (
    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-semibold text-gray-300">
      {initial}
    </div>
  );
}

function SocialPost({ item }: { item: ReadingItem }) {
  const [expanded, setExpanded] = useState(false);
  const content = item.content || "";
  const isLong = content.length > 300;
  const displayContent = expanded || !isLong ? content : content.slice(0, 300);

  const isLinkedIn = item.item_type === "linkedin";

  return (
    <div className="p-4">
      {/* Author header */}
      <div className="flex items-center gap-3 mb-3">
        <AuthorAvatar item={item} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-100 truncate">
              {item.author || "Unknown"}
            </span>
            {isLinkedIn ? <LinkedInIcon /> : <XIcon />}
          </div>
          <span className="text-xs text-gray-500">
            {new Date(item.created_at + "Z").toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Post content */}
      <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap break-words">
        {displayContent}
        {isLong && !expanded && "..."}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-blue-400 hover:text-blue-300 mt-1"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}

      {/* Post image */}
      {item.image && (
        <img
          src={item.image}
          alt=""
          className="mt-3 rounded-lg w-full max-h-80 object-cover"
        />
      )}

      {/* Source link */}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-3 text-xs text-gray-500 hover:text-gray-400"
      >
        View on {isLinkedIn ? "LinkedIn" : "X"} →
      </a>
    </div>
  );
}

function ArticleCard({ item }: { item: ReadingItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 hover:bg-gray-800/50"
    >
      <div className="flex gap-4">
        {item.image && (
          <img
            src={item.image}
            alt=""
            className="w-20 h-20 object-cover rounded shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-gray-100 truncate">
            {item.title || item.url}
          </h2>
          {item.description && (
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">
              {item.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            {item.author && <span>{item.author}</span>}
            {item.author && item.source && <span>·</span>}
            {item.source && <span>{item.source}</span>}
            <span>·</span>
            <span>
              {new Date(item.created_at + "Z").toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}

export function FeedItem({ item, onToggleRead, onDelete }: Props) {
  const isRead = item.is_read === 1;
  const isSocial = item.item_type === "linkedin" || item.item_type === "twitter";

  return (
    <div
      className={`border border-gray-800 rounded-lg overflow-hidden transition ${
        isRead ? "opacity-60" : ""
      }`}
    >
      {isSocial ? <SocialPost item={item} /> : <ArticleCard item={item} />}

      <div className="flex border-t border-gray-800">
        <button
          onClick={() => onToggleRead(item.id)}
          className="flex-1 text-xs py-2 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
        >
          {isRead ? "Mark unread" : "Mark read"}
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="flex-1 text-xs py-2 text-gray-400 hover:bg-gray-800 hover:text-red-400 border-l border-gray-800"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
