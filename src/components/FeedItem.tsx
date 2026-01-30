"use client";

import { useEffect, useRef, useState } from "react";

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

function extractTweetId(url: string): string | null {
  const match = url.match(/\/status\/(\d+)/);
  return match ? match[1] : null;
}

function extractLinkedInUrn(url: string): string | null {
  // Match patterns like /posts/username_activity-1234567890-xxxx
  // or /feed/update/urn:li:activity:1234567890
  const activityMatch = url.match(/activity[:-](\d+)/);
  if (activityMatch) return `urn:li:activity:${activityMatch[1]}`;

  const ugcMatch = url.match(/ugcPost[:-](\d+)/);
  if (ugcMatch) return `urn:li:ugcPost:${ugcMatch[1]}`;

  return null;
}

function TwitterEmbed({ item }: { item: ReadingItem }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !item.content) return;

    // Insert the oEmbed HTML
    containerRef.current.innerHTML = item.content;

    // Load or re-run Twitter's widget script to style the blockquote
    const win = window as typeof window & {
      twttr?: { widgets?: { load?: (el?: HTMLElement) => void } };
    };
    if (win.twttr?.widgets?.load) {
      win.twttr.widgets.load(containerRef.current);
    } else {
      const existingScript = document.querySelector(
        'script[src="https://platform.twitter.com/widgets.js"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://platform.twitter.com/widgets.js";
        script.async = true;
        document.body.appendChild(script);
      }
    }
  }, [item.content]);

  if (!item.content) {
    return (
      <div className="p-4">
        <p className="text-gray-400 text-sm">Could not load post.</p>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 text-sm hover:text-blue-300"
        >
          View on X →
        </a>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="p-4 min-h-[100px]" />
  );
}

function LinkedInEmbed({ url }: { url: string }) {
  const [iframeHeight, setIframeHeight] = useState(400);
  const urn = extractLinkedInUrn(url);

  if (!urn) {
    // Fallback: try embedding the URL directly
    return (
      <div className="p-4">
        <iframe
          src={`https://www.linkedin.com/embed/feed/update/${encodeURIComponent(url)}`}
          width="100%"
          height={iframeHeight}
          frameBorder="0"
          allowFullScreen
          title="LinkedIn Post"
          className="rounded"
          onLoad={(e) => {
            // Try to auto-resize
            try {
              const frame = e.target as HTMLIFrameElement;
              const h = frame.contentWindow?.document.body.scrollHeight;
              if (h && h > 100) setIframeHeight(h);
            } catch {
              // cross-origin, can't access
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-4">
      <iframe
        src={`https://www.linkedin.com/embed/feed/update/${urn}`}
        width="100%"
        height={iframeHeight}
        frameBorder="0"
        allowFullScreen
        title="LinkedIn Post"
        className="rounded"
        onLoad={(e) => {
          try {
            const frame = e.target as HTMLIFrameElement;
            const h = frame.contentWindow?.document.body.scrollHeight;
            if (h && h > 100) setIframeHeight(h);
          } catch {
            // cross-origin, can't access
          }
        }}
      />
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
  const isTwitter = item.item_type === "twitter";
  const isLinkedIn = item.item_type === "linkedin";

  return (
    <div
      className={`border border-gray-800 rounded-lg overflow-hidden transition ${
        isRead ? "opacity-60" : ""
      }`}
    >
      {isTwitter ? (
        <TwitterEmbed item={item} />
      ) : isLinkedIn ? (
        <LinkedInEmbed url={item.url} />
      ) : (
        <ArticleCard item={item} />
      )}

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
