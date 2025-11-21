import { useRouteLoaderData, redirect } from "react-router";
import { useState, useEffect } from "react";
import type { Route } from "./+types/home";
import { Header } from "../components/Header";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ArtworkCardLandscape } from "../components/ArtworkCardLandscape";
import { getRecentArtworks } from "../lib/artworks.server";

// Color schemes - Urban palette
const colorSchemes = {
  light: {
    name: "Urban - Light",
    primaryBg: "#E7E7E7",
    text: "#0E0E0E",
    secondaryBg: "#F0F0F0",
    divider: "#919191",
    accent: "#D24E47",
  },
  dark: {
    name: "Urban - Dark",
    primaryBg: "#1A1A1A",
    text: "#F5F5F5",
    secondaryBg: "#262626",
    divider: "#505050",
    accent: "#D24E47",
  },
};

export const loader: Route.LoaderFunction = async ({ request }) => {
  // Check if user is admin and redirect to dashboard
  const { getAuthTokenFromCookie, getUserFromToken } = await import("~/lib/auth.server");
  const { prismaClient } = await import("~/lib/db.server");

  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);
  const user = getUserFromToken(token);

  if (user) {
    const prisma = await prismaClient();
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (dbUser?.role === "ADMIN") {
      return redirect("/admin/dashboard");
    }
  }

  try {
    const artworks = await getRecentArtworks(20);
    return { artworks, currentUserId: user?.id };
  } catch (error) {
    console.error("[HOME] Error loading artworks:", error);
    return { artworks: [], currentUserId: user?.id };
  }
};

export default function HomePage() {
  const rootData = useRouteLoaderData("root") as any;
  const loaderData = useRouteLoaderData("routes/home") as any;
  const artworks = loaderData?.artworks ?? [];
  const currentUserId = loaderData?.currentUserId;

  const [selectedScheme, setSelectedScheme] = useState<keyof typeof colorSchemes>("light");
  const [isMounted, setIsMounted] = useState(false);

  const scheme = colorSchemes[selectedScheme];
  const noiseColor = selectedScheme === "light" ? "E7E7E7" : "1A1A1A";

  // Detect theme preference on client after hydration
  useEffect(() => {
    const initTheme = () => {
      const stored = localStorage.getItem("wandergraff-theme");
      if (stored === "light" || stored === "dark") {
        setSelectedScheme(stored);
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setSelectedScheme(prefersDark ? "dark" : "light");
      }
    };

    initTheme();
    setIsMounted(true);

    // Listen for theme changes from Header component
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.theme) {
        setSelectedScheme(customEvent.detail.theme);
      }
    };

    window.addEventListener("wandergraff-theme-change", handleThemeChange);
    return () => window.removeEventListener("wandergraff-theme-change", handleThemeChange);
  }, []);

  // Function to get column count and width for each "cycle" of the repeating 4, 3, 4 pattern
  const getRowConfig = (cycleIndex: number) => {
    const rowInCycle = cycleIndex % 3; // 0 = 4 cols, 1 = 3 cols, 2 = 4 cols
    if (rowInCycle === 0) {
      return { cols: 4, colsSmall: 2, colsMed: 2, width: "w-full" };
    } else if (rowInCycle === 1) {
      return { cols: 3, colsSmall: 1, colsMed: 2, width: "w-full lg:w-3/4" };
    } else {
      return { cols: 4, colsSmall: 2, colsMed: 2, width: "w-full" };
    }
  };

  // Build rows based on the repeating 4, 3, 4 pattern
  const buildGridRows = () => {
    const rows = [];
    let artworkIndex = 0;
    let cycleIndex = 0;

    while (artworkIndex < artworks.length) {
      const config = getRowConfig(cycleIndex);
      const rowArtworks = artworks.slice(artworkIndex, artworkIndex + config.cols);

      rows.push({
        config,
        artworks: rowArtworks,
        startIndex: artworkIndex,
      });

      artworkIndex += config.cols;
      cycleIndex++;
    }

    return rows;
  };

  const gridRows = buildGridRows();

  const renderRow = (row: any, rowIndex: number) => {
    const gridColsClass =
      row.config.cols === 4
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        : "grid-cols-1 sm:grid-cols-1 lg:grid-cols-3";

    const isCentered = row.config.cols === 3;
    const wrapper = isCentered ? (
      <div className="flex justify-center mb-6">
        <div className={`grid ${gridColsClass} gap-6 ${row.config.width}`}>
          {row.artworks.map((artwork: any) => (
            <ArtworkCardLandscape
              key={artwork.id}
              id={artwork.id}
              title={artwork.title}
              imageUrl={artwork.photos?.[0]?.photoUrl}
              artistName={artwork.artist?.name}
              claimStatus={artwork.claimStatus}
              artworkArtistId={artwork.artistId}
              currentUserId={currentUserId}
              currentUser={rootData?.user}
              photoCount={artwork.photos?.length ?? 0}
              onClick={() => (window.location.href = `/artwork/${artwork.id}`)}
            />
          ))}
        </div>
      </div>
    ) : (
      <div className={`grid ${gridColsClass} gap-6 mb-6`}>
        {row.artworks.map((artwork: any) => (
          <ArtworkCardLandscape
            key={artwork.id}
            id={artwork.id}
            title={artwork.title}
            imageUrl={artwork.photos?.[0]?.photoUrl}
            artistName={artwork.artist?.name}
            claimStatus={artwork.claimStatus}
            artworkArtistId={artwork.artistId}
            currentUserId={currentUserId}
            currentUser={rootData?.user}
            photoCount={artwork.photos?.length ?? 0}
            onClick={() => (window.location.href = `/artwork/${artwork.id}`)}
          />
        ))}
      </div>
    );

    return <div key={`row-${rowIndex}`}>{wrapper}</div>;
  };

  return (
    <div
      className="min-h-screen relative"
      suppressHydrationWarning
      style={{
        backgroundColor: scheme.primaryBg,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='4' seed='2'/%3E%3CfeColorMatrix type='saturate' values='0.08'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23${noiseColor}' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
        backgroundAttachment: "fixed",
      }}
    >
      <Header user={rootData?.user} />

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Gallery Section */}
        {artworks.length === 0 ? (
          <EmptyState
            title="No murals pinned yet"
            description="Be the first to pin a mural and start building our community gallery!"
            icon="📍"
            action={{
              label: rootData?.user ? "Pin the First Mural" : "Sign In to Pin",
              onClick: () => (window.location.href = rootData?.user ? "/artwork/register" : "/auth/login"),
            }}
          />
        ) : (
          <div>
            {gridRows.map((row, rowIndex) => renderRow(row, rowIndex))}
          </div>
        )}
      </main>
    </div>
  );
}
