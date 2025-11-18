export type User = {
  id: string;
  email: string;
  name?: string;
};

function decodeJWT(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid token format");
    }

    // Decode the payload (second part)
    const payload = parts[1];
    // Add padding if necessary
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded = Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch (error) {
    console.error("[AUTH] Failed to decode JWT:", error);
    return null;
  }
}

export function getUserFromToken(token: string | null): User | null {
  if (!token) {
    return null;
  }

  try {
    const decoded = decodeJWT(token);
    if (!decoded) {
      return null;
    }

    return {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.user_metadata?.name,
    };
  } catch (error) {
    console.error("[AUTH] Failed to get user from token:", error);
    return null;
  }
}

export function getAuthTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "auth-token") {
      return decodeURIComponent(value);
    }
  }

  return null;
}
