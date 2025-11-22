// Masonry layout presets - each preset is a sequence of grid spans
// Presets define how images are arranged in a 12-column grid
export const GALLERY_PRESETS = {
  preset_1: {
    name: "Modern Asymmetry",
    description: "Bold asymmetric layout with featured items",
    spans: [6, 4, 2, 3, 3, 6, 4, 4, 4], // Repeating pattern for masonry
  },
  preset_2: {
    name: "Flowing Gallery",
    description: "Organic flowing arrangement",
    spans: [4, 4, 4, 3, 3, 3, 3, 6, 6],
  },
  preset_3: {
    name: "Classic Grid",
    description: "Balanced symmetric layout",
    spans: [4, 4, 4, 4, 4, 4, 4, 4, 4],
  },
  preset_4: {
    name: "Featured Hero",
    description: "Hero image with balanced supporting items",
    spans: [12, 6, 6, 4, 4, 4, 3, 3, 3, 3],
  },
  preset_5: {
    name: "Dynamic Mix",
    description: "Mix of large and small focal points",
    spans: [5, 4, 3, 5, 4, 3, 4, 4, 4, 4],
  },
};

export type GalleryPresetKey = keyof typeof GALLERY_PRESETS;
