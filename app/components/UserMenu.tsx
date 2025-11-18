import { useState, useRef, useEffect } from "react";

type UserMenuProps = {
  user: {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
    role?: string;
  };
};

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.email[0].toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Button */}
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

      {/* Dropdown Menu */}
      {isOpen && (
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
      )}
    </div>
  );
}
