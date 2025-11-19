import { useParams } from "react-router";
import { useState, useEffect } from "react";
import { useRouteLoaderData } from "react-router";
import { Header } from "~/components/Header";
import { ArtworkCardLandscape } from "~/components/ArtworkCardLandscape";

// Artworks data (to be populated from database)
const ARTWORKS: any[] = [];

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

export default function ArtistDetailPage() {
  const { artistId = "" } = useParams();
  const rootData = useRouteLoaderData("root") as any;
  const [selectedScheme, setSelectedScheme] = useState<keyof typeof colorSchemes>("light");

  // Decode artist name from URL slug
  const decodedArtistName = artistId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Filter artworks for this artist
  const artistArtworks = ARTWORKS.filter(
    (artwork) => artwork.artistId === artistId
  );

  // Get first letter for navigation
  const firstLetter = decodedArtistName.charAt(0).toUpperCase();

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
        {/* Navigation Back Link */}
        <div className="mb-8">
          <a
            href={`/artists/${firstLetter.toLowerCase()}`}
            className="text-sm font-medium transition-colors"
            style={{
              color: scheme.accent,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "0.7";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "1";
            }}
          >
            ← Back to {firstLetter}
          </a>
        </div>

        {/* Artist Header */}
        <div className="mb-12">
          <h1
            className="text-5xl font-bold mb-4"
            style={{ color: scheme.text }}
          >
            {decodedArtistName}
          </h1>
          <p style={{ color: scheme.text, opacity: 0.7 }}>
            {artistArtworks.length} {artistArtworks.length === 1 ? "artwork" : "artworks"}
          </p>
        </div>

        {/* Artworks Grid */}
        {artistArtworks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {artistArtworks.map((artwork: any) => (
              <ArtworkCardLandscape
                key={artwork.id}
                id={artwork.id}
                title={artwork.title}
                imageUrl={artwork.imageUrl}
                artistName={artwork.artistName}
                claimStatus={artwork.claimStatus}
                artworkArtistId={artwork.artworkArtistId}
                currentUserId={rootData?.user?.id}
                currentUser={rootData?.user}
                photoCount={artwork.photoCount}
                onClick={() => (window.location.href = `/artwork/${artwork.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p style={{ color: scheme.text }}>
              No artworks found for {decodedArtistName}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
