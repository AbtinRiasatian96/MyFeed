"use client";

interface ReadingItem {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  source: string | null;
  is_read: number;
  created_at: string;
}

interface Props {
  item: ReadingItem;
  onToggleRead: (id: number) => void;
  onDelete: (id: number) => void;
}

export function FeedItem({ item, onToggleRead, onDelete }: Props) {
  const isRead = item.is_read === 1;

  return (
    <div
      className={`border border-gray-800 rounded-lg overflow-hidden transition ${
        isRead ? "opacity-60" : ""
      }`}
    >
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
              {item.source && <span>{item.source}</span>}
              <span>
                {new Date(item.created_at + "Z").toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </a>

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
