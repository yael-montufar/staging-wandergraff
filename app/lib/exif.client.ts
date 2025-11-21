export interface ExifData {
  latitude?: number;
  longitude?: number;
  altitude?: number;
  dateTime?: string;
  camera?: string;
  lens?: string;
}

export async function extractExifData(file: File): Promise<ExifData> {
  try {
    const exifr = await import("exifr");
    const result = await exifr.parse(file);
    
    return {
      latitude: result?.latitude,
      longitude: result?.longitude,
      altitude: result?.altitude,
      dateTime: result?.DateTime,
      camera: result?.Model,
      lens: result?.LensModel,
    };
  } catch (error) {
    console.error("Failed to extract EXIF data:", error);
    return {};
  }
}

export async function createPhotoPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target?.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function formatCoordinate(value: number): string {
  return value.toFixed(6);
}

export function formatDateTime(dateString?: string): string {
  if (!dateString) return "Unknown date";
  
  const matches = dateString.match(/(\d{4}):(\d{2}):(\d{2})\s(\d{2}):(\d{2}):(\d{2})/);
  if (matches) {
    return new Date(
      parseInt(matches[1]),
      parseInt(matches[2]) - 1,
      parseInt(matches[3]),
      parseInt(matches[4]),
      parseInt(matches[5]),
      parseInt(matches[6])
    ).toLocaleDateString();
  }
  return dateString;
}

export function parseExifDateTime(dateString: string): Date {
  const matches = dateString.match(/(\d{4}):(\d{2}):(\d{2})\s(\d{2}):(\d{2}):(\d{2})/);
  if (matches) {
    return new Date(
      parseInt(matches[1]),
      parseInt(matches[2]) - 1,
      parseInt(matches[3]),
      parseInt(matches[4]),
      parseInt(matches[5]),
      parseInt(matches[6])
    );
  }
  return new Date();
}
