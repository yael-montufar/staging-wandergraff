import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";

interface SearchResult {
  id: string;
  title: string;
  claimStatus: string;
  description?: string;
  address?: string;
  yearCreated?: number;
  artistName?: string;
  photoUrl?: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheme: {
    primaryBg: string;
    secondaryBg: string;
    text: string;
    accent: string;
  };
}

export default function SearchModal({ isOpen, onClose, scheme }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHoveredIndex, setIsHoveredIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Fetch search results from existing API
  const handleSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/artworks/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      const data = await response.json();
      setResults(data.artworks || []);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleResultClick = (artworkId: string) => {
    navigate(`/artwork/${artworkId}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
        style={{ backdropFilter: "blur(2px)" }}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[80vh]"
          style={{ backgroundColor: scheme.secondaryBg }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div
            className="border-b p-4"
            style={{ borderColor: scheme.accent + "40" }}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="Search artworks by title, artist, location..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                backgroundColor: scheme.primaryBg,
                color: scheme.text,
                width: "100%",
                padding: "12px 16px",
                borderRadius: "8px",
                border: `2px solid ${scheme.accent}40`,
                fontSize: "16px",
              }}
              className="focus:outline-none focus:ring-2"
              onFocus={(e) => {
                e.currentTarget.style.borderColor = scheme.accent;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = scheme.accent + "40";
              }}
            />
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <div
                className="p-8 text-center"
                style={{ color: scheme.text + "80" }}
              >
                Searching...
              </div>
            )}

            {!isLoading && results.length === 0 && query.length >= 2 && (
              <div
                className="p-8 text-center"
                style={{ color: scheme.text + "80" }}
              >
                No artworks found matching "{query}"
              </div>
            )}

            {!isLoading && query.length < 2 && (
              <div
                className="p-8 text-center"
                style={{ color: scheme.text + "80" }}
              >
                Type at least 2 characters to search
              </div>
            )}

            {!isLoading && results.length > 0 && (
              <div className="divide-y" style={{ borderColor: scheme.accent + "20" }}>
                {results.map((result, index) => (
                  <div
                    key={result.id}
                    onClick={() => handleResultClick(result.id)}
                    onMouseEnter={() => setIsHoveredIndex(index)}
                    onMouseLeave={() => setIsHoveredIndex(null)}
                    className="flex gap-4 p-4 cursor-pointer transition-all duration-200"
                    style={{
                      backgroundColor:
                        isHoveredIndex === index ? scheme.accent + "15" : "transparent",
                    }}
                  >
                    {/* Thumbnail */}
                    {result.photoUrl && (
                      <div
                        className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden"
                        style={{ backgroundColor: scheme.primaryBg }}
                      >
                        <img
                          src={result.photoUrl}
                          alt={result.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-semibold text-base truncate"
                        style={{ color: scheme.text }}
                      >
                        {result.title}
                      </h3>

                      {result.artistName && (
                        <p
                          className="text-xs mt-1"
                          style={{ color: scheme.text + "80" }}
                        >
                          by {result.artistName}
                        </p>
                      )}

                      {/* Address & Year */}
                      <div
                        className="flex gap-3 text-xs mt-2 flex-wrap"
                        style={{ color: scheme.text + "60" }}
                      >
                        {result.address && <span>{result.address}</span>}
                        {result.yearCreated && <span>{result.yearCreated}</span>}
                      </div>

                      {/* Status Badge */}
                      <div className="mt-2">
                        {result.claimStatus === "CLAIMED" && (
                          <span
                            className="text-xs font-medium px-2 py-1 rounded"
                            style={{
                              backgroundColor: "#10B98120",
                              color: "#059669",
                            }}
                          >
                            Claimed
                          </span>
                        )}
                        {result.claimStatus === "PENDING_APPROVAL" && (
                          <span
                            className="text-xs font-medium px-2 py-1 rounded"
                            style={{
                              backgroundColor: "#F59E0B20",
                              color: "#D97706",
                            }}
                          >
                            Pending Claim
                          </span>
                        )}
                        {result.claimStatus === "UNCLAIMED" && (
                          <span
                            className="text-xs font-medium px-2 py-1 rounded"
                            style={{
                              backgroundColor: scheme.accent + "20",
                              color: scheme.accent,
                            }}
                          >
                            Unclaimed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="border-t p-4 text-center text-xs"
            style={{ borderColor: scheme.accent + "40", color: scheme.text + "60" }}
          >
            Press <kbd style={{ background: scheme.accent + "20", padding: "2px 6px", borderRadius: "4px" }}>ESC</kbd> to close
          </div>
        </div>
      </div>
    </>
  );
}
