import { useState, useEffect } from "react";
import { useRouteLoaderData } from "react-router";
import { Header } from "~/components/Header";

interface Country {
  id: string;
  name: string;
  artworkCount: number;
}

// Color schemes - match site theme
const colorSchemes = {
  light: {
    primaryBg: "#E7E7E7",
    text: "#0E0E0E",
    secondaryBg: "#F0F0F0",
    divider: "#919191",
    accent: "#D24E47",
  },
  dark: {
    primaryBg: "#1A1A1A",
    text: "#F5F5F5",
    secondaryBg: "#262626",
    divider: "#505050",
    accent: "#D24E47",
  },
};

export default function CountriesPage() {
  const rootData = useRouteLoaderData("root") as any;
  const [selectedScheme, setSelectedScheme] = useState<keyof typeof colorSchemes>("light");
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch countries from API
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch("/api/browse/countries");
        if (response.ok) {
          const data = await response.json();
          setCountries(data);
        }
      } catch (error) {
        console.error("Failed to fetch countries:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCountries();
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

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Page Header */}
        <div className="mb-12">
          <h1
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ color: scheme.text }}
          >
            Discover by Country
          </h1>
          <p style={{ color: scheme.text }}>
            {countries.length > 0 ? `Explore ${countries.length} countries with street art` : "No countries yet"}
          </p>
        </div>

        {/* Countries Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p style={{ color: scheme.text }}>Loading...</p>
          </div>
        ) : countries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {countries.map((country) => (
              <a
                key={country.id}
                href={`/countries/${country.id}`}
                className="group p-6 rounded transition-all duration-200"
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
                <h2
                  className="text-xl font-bold mb-2 group-hover:transition-colors duration-200"
                  style={{ color: scheme.text }}
                >
                  {country.name}
                </h2>
                <p style={{ color: scheme.text }} className="opacity-70">
                  {country.artworkCount} artwork{country.artworkCount !== 1 ? "s" : ""}
                </p>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p style={{ color: scheme.text }}>No countries yet</p>
          </div>
        )}
      </main>
    </div>
  );
}
