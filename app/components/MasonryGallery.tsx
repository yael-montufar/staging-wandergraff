import { useTheme } from "~/lib/useTheme";
import { useMemo } from "react";

const GALLERY_PRESETS = {
  preset_1: {
    name: "Modern Asymmetry",
    description: "Bold asymmetric layout with featured items",
  },
  preset_2: {
    name: "Flowing Gallery",
    description: "Organic flowing arrangement",
  },
  preset_3: {
    name: "Classic Grid",
    description: "Balanced symmetric layout",
  },
  preset_4: {
    name: "Featured Hero",
    description: "Hero image with balanced supporting items",
  },
  preset_5: {
    name: "Dynamic Mix",
    description: "Mix of large and small focal points",
  },
};

export type GalleryPresetKey = keyof typeof GALLERY_PRESETS;

export interface MasonryGalleryProps {
  photos: Array<{
    id: string;
    photoUrl: string;
    user: { name: string; id: string };
    uploadedAt: string;
  }>;
  preset: GalleryPresetKey;
  onViewFullExperience?: () => void;
}

interface ColumnLayout {
  width: number;
  items: Array<{ height: number; photoIndex: number }>;
}

const ROW_HEIGHT = 160;
const TOTAL_ROWS = 3;
const GAP = 12;

// Column patterns: each column has items that sum to 3 rows (480px)
// Format: width in pixels, and array of row spans for items in that column
const COLUMN_PATTERNS: Array<{ width: number; spans: number[] }> = [
  { width: 228, spans: [1, 1, 1] }, // 3 single items
  { width: 228, spans: [2, 1] },    // 1 double, 1 single
  { width: 228, spans: [1, 2] },    // 1 single, 1 double
  { width: 228, spans: [1, 1, 1] }, // 3 single items
];

export function MasonryGallery({ photos, preset, onViewFullExperience }: MasonryGalleryProps) {
  const { scheme } = useTheme();

  if (photos.length === 0) {
    return null;
  }

  const presetConfig = GALLERY_PRESETS[preset];

  // Build columns based on pattern and available photos
  const itemsWithLayout = useMemo(() => {
    const result: Array<{
      photo: typeof photos[0];
      width: number;
      rowSpan: number;
    }> = [];

    let photoIndex = 0;
    let patternIndex = 0;

    while (photoIndex < photos.length) {
      const pattern = COLUMN_PATTERNS[patternIndex % COLUMN_PATTERNS.length];

      for (const span of pattern.spans) {
        if (photoIndex < photos.length) {
          result.push({
            photo: photos[photoIndex],
            width: pattern.width,
            rowSpan: span,
          });
          photoIndex++;
        }
      }

      patternIndex++;
    }

    return result;
  }, [photos]);

  return (
    <div className="mb-12">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1" suppressHydrationWarning style={{ color: scheme.text }}>
            Official Gallery
          </h2>
          <p className="text-sm" suppressHydrationWarning style={{ color: scheme.divider }}>
            Curated by Artist • {presetConfig.name}
          </p>
        </div>
      </div>

      <div
        className="mb-8 overflow-x-auto overflow-y-hidden rounded-lg"
        style={{
          height: `${ROW_HEIGHT * TOTAL_ROWS + GAP * (TOTAL_ROWS - 1)}px`,
          scrollBehavior: "smooth",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateRows: `repeat(${TOTAL_ROWS}, ${ROW_HEIGHT}px)`,
            gridAutoFlow: "column",
            gridAutoColumns: "max-content",
            gap: `${GAP}px`,
            padding: "0",
            minWidth: "min-content",
            alignContent: "start",
          }}
        >
          {itemsWithLayout.map((item, index) => (
            <div
              key={`${item.photo.id}-${index}`}
              style={{
                gridRowEnd: `span ${item.rowSpan}`,
                width: `${item.width}px`,
              }}
            >
              <div className="relative w-full h-full rounded-lg overflow-hidden bg-gray-200 group cursor-pointer hover:shadow-lg transition-shadow">
                <img
                  src={item.photo.photoUrl}
                  alt="Gallery"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                <div
                  className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end p-3"
                  suppressHydrationWarning
                >
                  <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-gray-200">by {item.photo.user.name}</p>
                    <p className="text-xs text-gray-300" suppressHydrationWarning>
                      {new Date(item.photo.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {onViewFullExperience && (
        <div className="flex justify-center">
          <button
            onClick={onViewFullExperience}
            className="px-6 py-2 rounded-lg font-medium transition-all"
            suppressHydrationWarning
            style={{
              backgroundColor: scheme.accent,
              color: "white",
            }}
          >
            View Full Experience
          </button>
        </div>
      )}
    </div>
  );
}
