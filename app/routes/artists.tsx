import { useState, useEffect, useRef, useCallback } from "react";
import { useRouteLoaderData } from "react-router";
import { Header } from "~/components/Header";

interface Artist {
  id: string;
  name: string;
  artworkCount: number;
}

interface ArtistsByLetter {
  [letter: string]: Artist[];
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Color schemes - match site theme
const colorSchemes = {
  light: {
    primaryBg: "#E7E7E7",
    text: "#0E0E0E",
    secondaryBg: "#F0F0F0",
    accent: "#D24E47",
  },
  dark: {
    primaryBg: "#1A1A1A",
    text: "#F5F5F5",
    secondaryBg: "#262626",
    accent: "#D24E47",
  },
};

interface ArtistGridProps {
  letter: string;
  artists: Artist[];
  scheme: typeof colorSchemes.light;
}

function slugifyArtistName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function ArtistSection({ letter, artists, scheme }: ArtistGridProps) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-4 mb-6">
        <h2
          className="text-3xl font-bold"
          style={{ color: scheme.text }}
        >
          {letter}
        </h2>
        <div
          className="flex-1 h-[1px]"
          style={{ backgroundColor: scheme.accent, opacity: 0.3 }}
        />
      </div>

      {artists.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {artists.map((artist) => (
            <a
              key={artist.id}
              href={`/artist/${artist.id}`}
              className="p-6 rounded transition-all duration-200 group"
              style={{
                backgroundColor: scheme.secondaryBg,
                border: `2px solid transparent`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = scheme.accent;
                (e.currentTarget as HTMLElement).style.backgroundColor = scheme.primaryBg;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "transparent";
                (e.currentTarget as HTMLElement).style.backgroundColor = scheme.secondaryBg;
              }}
            >
              <div
                className="text-sm font-medium truncate"
                style={{ color: scheme.text }}
              >
                {artist.name}
              </div>
              <div
                className="text-xs mt-1 opacity-70"
                style={{ color: scheme.text }}
              >
                {artist.artworkCount} artwork{artist.artworkCount !== 1 ? "s" : ""}
              </div>
            </a>
          ))}
        </div>
      ) : (
        <p style={{ color: scheme.text, opacity: 0.6 }}>
          No artists found starting with "{letter}"
        </p>
      )}
    </div>
  );
}

export default function ArtistsIndexPage() {
  const rootData = useRouteLoaderData("root") as any;
  const [selectedScheme, setSelectedScheme] = useState<keyof typeof colorSchemes>("light");
  const [artistsByLetter, setArtistsByLetter] = useState<ArtistsByLetter>({});
  const [displayedLetters, setDisplayedLetters] = useState<string[]>(["A", "B", "C"]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Fetch artists from API
  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const response = await fetch("/api/browse/artists");
        if (response.ok) {
          const data = await response.json();
          setArtistsByLetter(data);
        }
      } catch (error) {
        console.error("Failed to fetch artists:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchArtists();
  }, []);

  // Detect theme preference
  useEffect(() => {
    const stored = localStorage.getItem("wandergraff-theme");
    if (stored === "light" || stored === "dark") {
      setSelectedScheme(stored);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setSelectedScheme(prefersDark ? "dark" : "light");
    }

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.theme) {
        setSelectedScheme(customEvent.detail.theme);
      }
    };

    window.addEventListener("wandergraff-theme-change", handleThemeChange);
    return () => window.removeEventListener("wandergraff-theme-change", handleThemeChange);
  }, []);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && displayedLetters.length < ALPHABET.length) {
          setIsLoadingMore(true);
          // Simulate network delay
          setTimeout(() => {
            setDisplayedLetters((prev) => {
              const nextIndex = ALPHABET.indexOf(prev[prev.length - 1]) + 1;
              if (nextIndex < ALPHABET.length) {
                return [...prev, ALPHABET[nextIndex]];
              }
              return prev;
            });
            setIsLoadingMore(false);
          }, 300);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [isLoadingMore, displayedLetters]);

  const scheme = colorSchemes[selectedScheme];
  const noiseColor = selectedScheme === "light" ? "E7E7E7" : "1A1A1A";

  return (
    <div
      className="min-h-screen"
      suppressHydrationWarning
      style={{
        backgroundColor: scheme.primaryBg,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='4' seed='2'/%3E%3CfeColorMatrix type='saturate' values='0.08'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23${noiseColor}' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
        backgroundAttachment: "fixed",
      }}
    >
      <Header user={rootData?.user} />

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Page Header */}
        <div className="mb-16">
          <h1
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ color: scheme.text }}
          >
            Browse Artists
          </h1>
          <p style={{ color: scheme.text, opacity: 0.7 }}>
            Scroll through all artists by name. Click on any artist to explore their artworks.
          </p>
        </div>

        {/* Loading state */}
        {isLoadingData ? (
          <div className="flex justify-center py-12">
            <div
              className="animate-spin rounded-full h-8 w-8"
              style={{ borderColor: `${scheme.accent}30`, borderTopColor: scheme.accent, borderWidth: "3px" }}
            />
          </div>
        ) : Object.keys(artistsByLetter).length > 0 ? (
          <>
            {/* Artists Grid by Letter */}
            <div className="space-y-12">
              {displayedLetters.map((letter) => (
                <ArtistSection
                  key={letter}
                  letter={letter}
                  artists={artistsByLetter[letter] || []}
                  scheme={scheme}
                />
              ))}
            </div>

            {/* Loading indicator for infinite scroll */}
            {isLoadingMore && (
              <div className="flex justify-center py-8">
                <div
                  className="animate-spin rounded-full h-8 w-8"
                  style={{ borderColor: `${scheme.accent}30`, borderTopColor: scheme.accent, borderWidth: "3px" }}
                />
              </div>
            )}

            {/* Infinite scroll sentinel */}
            <div ref={observerTarget} className="py-8 text-center">
              {displayedLetters.length >= ALPHABET.length ? (
                <p style={{ color: scheme.text, opacity: 0.5 }}>
                  You've reached the end
                </p>
              ) : (
                <p style={{ color: scheme.text, opacity: 0.5 }}>
                  Scroll to load more artists...
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p style={{ color: scheme.text }}>No artists yet</p>
          </div>
        )}
      </main>
    </div>
  );
}
