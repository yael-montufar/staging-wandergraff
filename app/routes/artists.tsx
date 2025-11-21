import { useState, useEffect, useRef } from "react";
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

function ArtistSection({ letter, artists, scheme }: ArtistGridProps) {
  const hasArtists = artists.length > 0;

  return (
    <div className="mb-12 scroll-mt-32">
      <div className="flex items-center gap-4 mb-6">
        <a
          href={`/artists/${letter.toLowerCase()}`}
          className="text-3xl font-bold transition-colors duration-200 no-underline hover:opacity-80"
          style={{ color: hasArtists ? "#D24E47" : scheme.text, opacity: hasArtists ? 1 : 0.5 }}
        >
          {letter}
        </a>
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
  const [isLoadingData, setIsLoadingData] = useState(true);
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Handle letter navigation/scroll
  const handleLetterClick = (letter: string) => {
    const element = sectionRefs.current[letter];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

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

      <main className="flex gap-8 max-w-7xl mx-auto px-4 py-12">
        {/* Sidebar Navigation */}
        <aside className="sticky top-12 h-fit">
          <div className="w-32 rounded-lg p-4" style={{ backgroundColor: scheme.secondaryBg }}>
            <div className="grid grid-cols-2 gap-2">
              {ALPHABET.map((letter) => (
                <button
                  key={letter}
                  onClick={() => handleLetterClick(letter)}
                  className="py-2 px-3 rounded font-bold transition-all duration-200 cursor-pointer text-sm"
                  style={{
                    backgroundColor: artistsByLetter[letter]?.length > 0 ? scheme.accent : "transparent",
                    color: artistsByLetter[letter]?.length > 0 ? scheme.primaryBg : scheme.text,
                    border: `1px solid ${artistsByLetter[letter]?.length > 0 ? scheme.accent : scheme.text}`,
                    opacity: artistsByLetter[letter]?.length === 0 ? 0.4 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (artistsByLetter[letter]?.length === 0) {
                      (e.currentTarget as HTMLElement).style.opacity = "0.6";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (artistsByLetter[letter]?.length === 0) {
                      (e.currentTarget as HTMLElement).style.opacity = "0.4";
                    }
                  }}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Page Header */}
          <div className="mb-16">
            <h1
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ color: scheme.text }}
            >
              Browse Artists
            </h1>
            <p style={{ color: scheme.text, opacity: 0.7 }}>
              Click a letter in the sidebar to jump to artists starting with that letter.
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
                {ALPHABET.map((letter) => (
                  <div
                    key={letter}
                    ref={(el) => {
                      if (el) sectionRefs.current[letter] = el;
                    }}
                  >
                    <ArtistSection
                      letter={letter}
                      artists={artistsByLetter[letter] || []}
                      scheme={scheme}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p style={{ color: scheme.text }}>No artists yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
