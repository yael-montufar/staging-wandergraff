import { useParams } from "react-router";
import { useState, useEffect } from "react";
import { useRouteLoaderData } from "react-router";
import { Header } from "~/components/Header";
import { ArtworkCardLandscape } from "~/components/ArtworkCardLandscape";

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

export default function YearDetailPage() {
  const { year } = useParams();
  const rootData = useRouteLoaderData("root") as any;
  const [selectedScheme, setSelectedScheme] = useState<keyof typeof colorSchemes>("light");
  const [artworks, setArtworks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch artworks by year
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/artworks/by-year?year=${year}`);
        if (response.ok) {
          const data = await response.json();
          setArtworks(data);
        }
      } catch (error) {
        console.error("Failed to fetch year data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [year]);

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
      
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Back and Header */}
        <div className="mb-12">
          <a
            href="/years"
            className="inline-block mb-4 font-semibold transition-colors duration-200"
            style={{ color: scheme.accent }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.opacity = "0.8"}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.opacity = "1"}
          >
            ← Back to Years
          </a>
          <h1
            className="text-4xl md:text-5xl font-bold"
            style={{ color: scheme.text }}
          >
            {year}
          </h1>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div
              className="animate-spin rounded-full h-8 w-8"
              style={{ borderColor: `${scheme.accent}30`, borderTopColor: scheme.accent, borderWidth: "3px" }}
            />
          </div>
        ) : artworks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {artworks.map((artwork: any) => (
              <ArtworkCardLandscape
                key={artwork.id}
                id={artwork.id}
                title={artwork.title}
                imageUrl={artwork.photos?.[0]?.photoUrl}
                artistName={artwork.artist?.name}
                claimStatus={artwork.claimStatus}
                artworkArtistId={artwork.artistId}
                currentUserId={rootData?.user?.id}
                currentUser={rootData?.user}
                photoCount={artwork.photos?.length || 0}
                onClick={() => (window.location.href = `/artwork/${artwork.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p style={{ color: scheme.text }}>No artworks found for {year}</p>
          </div>
        )}
      </main>
    </div>
  );
}
