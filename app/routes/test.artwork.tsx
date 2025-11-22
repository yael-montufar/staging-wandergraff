import { useState, useEffect } from "react";
import type { Route } from "./+types/test.artwork";
import { Header } from "../components/Header";
import { MasonryGallery } from "../components/MasonryGallery";
import { CommunityGallery } from "../components/CommunityGallery";
import { useTheme } from "../lib/useTheme";

// Mock artwork data
const mockArtwork = {
  id: "test-artwork-1",
  title: "Urban Expression Mural",
  artist: "Lucia Romero",
  description: "A vibrant mural celebrating street art culture and urban landscapes",
  country: "Spain",
  city: "Barcelona",
  latitude: 41.3851,
  longitude: 2.1734,
  claimStatus: "CLAIMED" as const,
  galleryPublished: true,
  galleryPreset: "preset_1" as const,
  artistId: "artist-1",
};

// Mock official gallery photos
const mockOfficialPhotos = Array.from({ length: 24 }, (_, i) => ({
  id: `photo-${i + 1}`,
  photoUrl: `https://picsum.photos/400/300?random=${i + 1}`,
  user: { name: "Lucia Romero", id: "artist-1" },
  uploadedAt: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000).toISOString(),
}));

// Mock community gallery photos
const mockCommunityPhotos = [
  {
    id: "community-1",
    photoUrl: "https://picsum.photos/300/300?random=10",
    user: { name: "Street Photography Fan", id: "user-1" },
    uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "community-2",
    photoUrl: "https://picsum.photos/300/300?random=11",
    user: { name: "Urban Explorer", id: "user-2" },
    uploadedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "community-3",
    photoUrl: "https://picsum.photos/300/300?random=12",
    user: { name: "Art Collector", id: "user-3" },
    uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "community-4",
    photoUrl: "https://picsum.photos/300/300?random=13",
    user: { name: "Barcelona Local", id: "user-4" },
    uploadedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "community-5",
    photoUrl: "https://picsum.photos/300/300?random=14",
    user: { name: "Photography Enthusiast", id: "user-5" },
    uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "community-6",
    photoUrl: "https://picsum.photos/300/300?random=15",
    user: { name: "Tourist", id: "user-6" },
    uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "community-7",
    photoUrl: "https://picsum.photos/300/300?random=16",
    user: { name: "Mural Fan", id: "user-7" },
    uploadedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "community-8",
    photoUrl: "https://picsum.photos/300/300?random=17",
    user: { name: "Street Art Lover", id: "user-8" },
    uploadedAt: new Date().toISOString(),
  },
  {
    id: "community-9",
    photoUrl: "https://picsum.photos/300/300?random=18",
    user: { name: "Barcelona Guide", id: "user-9" },
    uploadedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
];

export default function TestArtworkPage() {
  const { scheme } = useTheme();
  const [communityPhotos, setCommunityPhotos] = useState(mockCommunityPhotos);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering theme-dependent content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLoadMoreCommunity = () => {
    setCommunityLoading(true);
    // Simulate loading delay
    setTimeout(() => {
      const newPhotos = Array.from({ length: 3 }, (_, i) => ({
        id: `community-${communityPhotos.length + i + 1}`,
        photoUrl: `https://picsum.photos/300/300?random=${20 + communityPhotos.length + i}`,
        user: { name: `User ${communityPhotos.length + i + 1}`, id: `user-${communityPhotos.length + i + 1}` },
        uploadedAt: new Date(Date.now() - (100 - communityPhotos.length - i) * 60 * 60 * 1000).toISOString(),
      }));
      setCommunityPhotos([...communityPhotos, ...newPhotos]);
      setCommunityLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: scheme.background }}>
      <Header />

      <main className="min-h-screen px-2 py-4 sm:px-4 sm:py-6">
        <div className="min-h-screen px-2 py-4 sm:px-4 sm:py-6">
          <div className="space-y-8">
            {/* Official Gallery - Horizontal Scroll Layout */}
            {mounted && mockOfficialPhotos.length > 0 && (
              <div>
                <MasonryGallery
                  photos={mockOfficialPhotos}
                  preset="preset_1"
                  onViewFullExperience={() => {
                    console.log("View full experience clicked");
                  }}
                />
                <div className="flex justify-center mb-8">
                  <button
                    className="text-sm font-medium px-4 py-2 rounded border-2 hover:shadow-lg transition-all"
                    style={{
                      borderColor: scheme.accent,
                      color: scheme.accent,
                    }}
                  >
                    ✏️ Manage Gallery
                  </button>
                </div>
              </div>
            )}

            {/* Community Gallery */}
            {mounted && communityPhotos.length > 0 && (
              <CommunityGallery
                photos={communityPhotos}
                hasMore={communityPhotos.length < 30}
                onLoadMore={handleLoadMoreCommunity}
                isLoading={communityLoading}
              />
            )}
          </div>
        </div>

        {/* Details Sidebar - Below Gallery */}
        {mounted && (
        <div className="max-w-4xl">
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6" style={{ backgroundColor: scheme.card, color: scheme.text }}>
            <div>
              <h1 className="text-3xl font-bold mb-2">{mockArtwork.title}</h1>
              <p className="text-lg" style={{ color: scheme.divider }}>
                by <span className="font-semibold">{mockArtwork.artist}</span>
              </p>
            </div>

            <div className="border-t pt-4" style={{ borderColor: scheme.divider }}>
              <h2 className="text-lg font-semibold mb-2">Location</h2>
              <p className="text-sm mb-1">{mockArtwork.city}, {mockArtwork.country}</p>
              <p className="text-xs" style={{ color: scheme.divider }}>
                {mockArtwork.latitude.toFixed(4)}, {mockArtwork.longitude.toFixed(4)}
              </p>
            </div>

            <div className="border-t pt-4" style={{ borderColor: scheme.divider }}>
              <h2 className="text-lg font-semibold mb-2">About</h2>
              <p className="text-sm">{mockArtwork.description}</p>
            </div>

            <div className="border-t pt-4" style={{ borderColor: scheme.divider }}>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <span
                    className="text-xs font-medium px-2 py-1 rounded"
                    style={{
                      backgroundColor: mockArtwork.claimStatus === "CLAIMED" ? "rgb(220 252 231)" : "rgb(243 244 246)",
                      color: mockArtwork.claimStatus === "CLAIMED" ? "rgb(20 83 45)" : "rgb(75 85 99)",
                    }}
                  >
                    {mockArtwork.claimStatus === "CLAIMED" ? "✓ Claimed" : "⊝ Unclaimed"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </main>
    </div>
  );
}
