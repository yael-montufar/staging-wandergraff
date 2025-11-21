import { useState, useRef, useEffect } from "react";

type UserMenuProps = {
  user: {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
    role?: string;
  };
  scheme?: {
    primaryBg: string;
    text: string;
    secondaryBg: string;
    divider: string;
    accent: string;
  };
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
};

export function UserMenu({ user, scheme, isOpen: externalIsOpen, onToggle }: UserMenuProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Use external state if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = onToggle || setInternalIsOpen;

  // Close dropdown when clicking outside (only if not using external state)
  useEffect(() => {
    if (externalIsOpen !== undefined) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [externalIsOpen, onToggle]);

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.email[0].toUpperCase();

  // Use scheme colors if provided, otherwise use default blue theme
  const isUsingScheme = !!scheme;

  return (
    <div ref={menuRef}>
      {/* Avatar Button */}
      {isUsingScheme ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            backgroundColor: scheme.accent,
            color: scheme.text,
          }}
          className="px-6 py-3 hover:opacity-80 transition flex items-center justify-center font-bold"
        >
          {initials}
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-10 h-10 rounded-full overflow-hidden bg-blue-600 text-white font-semibold flex items-center justify-center hover:opacity-90 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          title={user.name || user.email}
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name || "Avatar"}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        isUsingScheme ? (
          <div
            className="absolute right-0 mt-2 w-56 z-50"
            style={{
              backgroundColor: scheme.secondaryBg,
              borderBottom: `2px solid ${scheme.text}`,
            }}
          >
            {/* User Info */}
            <div
              className="px-4 py-3"
              style={{
                borderBottom: `1px solid ${scheme.divider}`,
              }}
            >
              <p className="font-bold uppercase" style={{ color: scheme.text }}>
                {user.name || "User"}
              </p>
              <p className="text-xs" style={{ color: scheme.divider }}>
                {user.email}
              </p>
            </div>

            {/* Menu Items */}
            <a
              href={user.role === "ADMIN" ? "/admin/dashboard" : "/user/profile"}
              onClick={() => setIsOpen(false)}
              className="block px-4 py-3 font-bold uppercase text-sm hover:opacity-80 transition"
              style={{ color: scheme.accent }}
            >
              📊 Dashboard
            </a>
            {user.role !== "ADMIN" && (
              <a
                href="/user/settings"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-3 font-bold uppercase text-sm hover:opacity-80 transition"
                style={{ color: scheme.accent }}
              >
                ⚙️ Settings
              </a>
            )}

            {/* Divider */}
            <div
              style={{
                borderTop: `1px solid ${scheme.divider}`,
              }}
            ></div>

            {/* Sign Out */}
            <form method="POST" action="/auth/logout">
              <button
                type="submit"
                className="w-full text-left px-4 py-3 font-bold uppercase text-sm hover:opacity-80 transition"
                style={{ color: scheme.accent }}
              >
                👋 Sign Out
              </button>
            </form>
          </div>
        ) : (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-900">
                {user.name || "User"}
              </p>
              <p className="text-xs text-gray-600">{user.email}</p>
            </div>

            {/* Menu Items */}
            <a
              href={user.role === "ADMIN" ? "/admin/dashboard" : "/user/profile"}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
              onClick={() => setIsOpen(false)}
            >
              📊 Dashboard
            </a>
            {user.role !== "ADMIN" && (
              <a
                href="/user/settings"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                onClick={() => setIsOpen(false)}
              >
                ⚙️ Settings
              </a>
            )}

            {/* Divider */}
            <div className="border-t border-gray-200 my-1"></div>

            {/* Logout */}
            <form method="POST" action="/auth/logout">
              <button
                type="submit"
                className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition"
              >
                👋 Sign Out
              </button>
            </form>
          </div>
        )
      )}
    </div>
  );
}
