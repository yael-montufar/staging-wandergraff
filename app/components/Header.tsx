import { useState, useEffect, useRef } from "react";
import SearchModal from "./SearchModal";
import placeholderImg from "../assets/wandergraff-placeholder.jpg?url";

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

// Logo fonts
const logoFonts = [
  { name: "Bebas Neue", family: "'Bebas Neue', 'Arial Black', sans-serif", weight: 700 },
  { name: "Impact", family: "'Impact', 'Arial Black', sans-serif", weight: 900 },
  { name: "Arial Black", family: "'Arial Black', 'Arial', sans-serif", weight: 900 },
  { name: "Trebuchet Bold", family: "'Trebuchet MS', sans-serif", weight: 900 },
  { name: "Oswald", family: "'Oswald', sans-serif", weight: 700 },
  { name: "Playfair Bold", family: "'Playfair Display', serif", weight: 900 },
  { name: "Courier Bold", family: "'Courier New', monospace", weight: 700 },
];

type HeaderProps = {
  user?: {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
    role?: string;
  } | null;
};

export function Header({ user }: HeaderProps) {
  const [selectedScheme, setSelectedScheme] = useState<keyof typeof colorSchemes>("light");
  const [selectedFont] = useState(0);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const scheme = colorSchemes[selectedScheme];
  const logoFont = logoFonts[selectedFont];

  // Detect theme preference on client after hydration
  useEffect(() => {
    const stored = localStorage.getItem("wandergraff-theme");
    if (stored === "light" || stored === "dark") {
      setSelectedScheme(stored);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setSelectedScheme(prefersDark ? "dark" : "light");
    }
    setIsMounted(true);
  }, []);

  // Keyboard shortcut for search (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleThemeChange = (newTheme: keyof typeof colorSchemes) => {
    setSelectedScheme(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("wandergraff-theme", newTheme);
      // Dispatch custom event for other components to listen to
      window.dispatchEvent(
        new CustomEvent("wandergraff-theme-change", { detail: { theme: newTheme } })
      );
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsAvatarMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu when clicking outside and prevent scrolling when open
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }

    if (isMobileMenuOpen) {
      // Prevent body scroll
      document.body.style.overflow = "hidden";
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.body.style.overflow = "unset";
      };
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isMobileMenuOpen]);

  return (
    <header
      className="border-b-2"
      suppressHydrationWarning
      style={{
        backgroundColor: scheme.secondaryBg,
        borderColor: scheme.text,
      }}
    >
      <div className="max-w-full mx-auto">
        {/* Logo Section */}
        <div
          className="px-4 sm:px-6 lg:px-8 pt-4 pb-2 text-center"
          suppressHydrationWarning
        >
          <a href="/">
            <h1
              style={{
                color: scheme.accent,
                fontFamily: logoFont.family,
                fontWeight: logoFont.weight,
                letterSpacing: "0.08em",
                fontSize: "clamp(4rem, 15vw, 12rem)",
              }}
              className="uppercase leading-none whitespace-nowrap"
            >
              WANDERGRAFF
            </h1>
          </a>
        </div>

        {/* Tagline Section */}
        <div
          className="px-4 sm:px-6 lg:px-8 pt-2 pb-4 text-center border-b-2"
          suppressHydrationWarning
          style={{ borderColor: scheme.divider }}
        >
          <p
            style={{
              color: scheme.accent,
              fontSize: "clamp(1.25rem, 3vw, 3rem)",
            }}
            className="font-bold uppercase tracking-widest"
          >
            World Wide Street Art Archive
          </p>
        </div>

        {/* Search Bar, Controls, and Navigation */}
        <div
          className="px-4 sm:px-6 lg:px-8 py-6"
          suppressHydrationWarning
        >
          <div className="flex flex-col gap-3">
            {/* Row 1: Search Bar + Controls */}
            <div className="flex flex-wrap gap-3 items-stretch justify-center w-full">
              {/* Search Bar */}
              <div className="flex flex-grow min-w-[280px] basis-[400px]">
                <input
                  type="text"
                  placeholder="Search (Ctrl+K)"
                  onClick={() => setIsSearchOpen(true)}
                  readOnly
                  style={{
                    backgroundColor: scheme.primaryBg,
                    color: scheme.text,
                    cursor: "pointer",
                  }}
                  className="flex-1 px-6 py-3 placeholder-opacity-60 focus:outline-none h-12"
                  title={typeof window !== "undefined" && navigator.platform.indexOf("Mac") > -1 ? "Search (⌘+K)" : "Search (Ctrl+K)"}
                />
                <button
                  onClick={() => setIsSearchOpen(true)}
                  style={{
                    backgroundColor: scheme.accent,
                    color: "#FFFFFF",
                  }}
                  className="px-8 py-3 font-bold uppercase hover:opacity-80 transition flex items-center justify-center h-12 shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>
              </div>

              {/* Controls Group */}
              <div className="flex items-stretch flex-wrap justify-center gap-3">
                {/* Theme Toggle */}
                <button
                  onClick={() => handleThemeChange(selectedScheme === "light" ? "dark" : "light")}
                  style={{
                    backgroundColor: scheme.accent,
                    color: "#FFFFFF",
                  }}
                  className="px-4 py-3 font-bold uppercase text-sm hover:opacity-80 transition h-12"
                >
                  {selectedScheme === "light" ? "🌙" : "☀️"}
                </button>

                {/* Social Icons - Hidden on mobile */}
                <div className="hidden lg:flex gap-3">
                  <a
                    href="#"
                    style={{
                      backgroundColor: selectedScheme === "dark" ? "#FFFFFF" : scheme.secondaryBg,
                    }}
                    className="hover:opacity-70 transition w-12 h-12 flex items-center justify-center rounded-full"
                  >
                    <svg
                      className="w-full h-full"
                      viewBox="0 0 36 36"
                      fill={scheme.accent}
                    >
                      <path d="M36.03 16.215C35.19 7.8 28.38 0.99 19.95 0.15C17.29 -0.122 14.604 0.201 12.085 1.097C9.566 1.993 7.279 3.438 5.388 5.328C3.498 7.219 2.053 9.506 1.157 12.025C0.261 14.544 -0.062 17.231 0.21 19.89C1.05 28.32 7.86 35.13 16.275 35.955C27.66 37.08 37.155 27.6 36.015 16.215H36.03ZM24.54 9.9H24.225C23.46 9.9 22.695 9.885 21.945 9.9C20.895 9.945 20.13 10.335 20.085 11.64C20.055 12.585 20.055 14.79 20.055 14.79H24.42C24.225 16.305 24.03 17.76 23.835 19.245H20.07V30.36H15.465V19.23H11.7V14.805H15.495V14.475C15.495 13.59 15.48 12.69 15.495 11.805C15.495 11.235 15.54 10.665 15.63 10.11C15.87 8.76 16.485 7.62 17.625 6.795C18.615 6.09 19.74 5.79 20.94 5.775C21.72 5.76 22.5 5.79 23.28 5.835C23.7 5.85 24.135 5.91 24.54 5.955V9.915V9.9Z" />
                    </svg>
                  </a>
                  <a
                    href="#"
                    style={{
                      backgroundColor: selectedScheme === "dark" ? "#FFFFFF" : scheme.secondaryBg,
                    }}
                    className="hover:opacity-70 transition w-12 h-12 flex items-center justify-center rounded-full"
                  >
                    <svg
                      className="w-full h-full"
                      viewBox="0 0 36 36"
                      fill={scheme.accent}
                    >
                      <path d="M18.075 14.355C17.59 14.351 17.11 14.442 16.66 14.624C16.211 14.805 15.802 15.074 15.456 15.414C15.111 15.754 14.836 16.158 14.647 16.605C14.458 17.051 14.359 17.53 14.355 18.015C14.34 20.055 15.975 21.72 18.015 21.735C20.055 21.75 21.72 20.115 21.735 18.075C21.75 16.035 20.115 14.37 18.075 14.355Z" />
                      <path d="M23.625 9.165C21.735 8.88 14.655 8.895 12.69 9.12C10.755 9.33 9.465 10.545 9.165 12.465C8.85 14.505 8.91 22.155 9.165 23.685C9.435 25.29 10.335 26.385 11.925 26.82C13.59 27.285 21.6 27.18 23.385 26.985C25.335 26.775 26.625 25.575 26.925 23.625C27.225 21.66 27.165 14.535 26.97 12.705C26.76 10.755 25.56 9.465 23.625 9.165ZM18.045 23.745C14.895 23.745 12.345 21.195 12.345 18.045C12.345 14.895 14.895 12.345 18.045 12.345C21.195 12.345 23.745 14.895 23.745 18.045C23.745 21.195 21.195 23.745 18.045 23.745ZM23.97 13.47C23.235 13.47 22.635 12.87 22.635 12.135C22.635 11.4 23.235 10.8 23.97 10.8C24.705 10.8 25.305 11.4 25.305 12.135C25.305 12.87 24.705 13.47 23.97 13.47Z" />
                      <path d="M18.045 0C8.085 0 0 8.085 0 18.045C0 28.005 8.085 36.09 18.045 36.09C28.005 36.09 36.09 28.005 36.09 18.045C36.09 8.085 28.005 0 18.045 0ZM28.83 24.465C28.17 27 26.52 28.5 23.955 28.905C22.02 29.22 13.41 29.28 11.655 28.83C9.12 28.17 7.605 26.535 7.185 23.985C6.87 22.11 6.765 13.395 7.305 11.505C7.995 9.045 9.63 7.59 12.12 7.185C14.295 6.825 20.505 6.915 23.115 7.065C24.645 7.14 26.04 7.635 27.195 8.715C28.29 9.75 28.845 11.04 28.995 12.51C29.175 14.265 29.355 22.515 28.845 24.465H28.83Z" />
                    </svg>
                  </a>
                </div>

                {/* Auth/User Menu */}
                {user ? (
                  <div ref={menuRef} className="relative">
                    <button
                      onClick={() => setIsAvatarMenuOpen(!isAvatarMenuOpen)}
                      style={{
                        backgroundColor: scheme.accent,
                        color: "#FFFFFF",
                      }}
                      className="w-12 h-12 hover:opacity-80 transition flex items-center justify-center font-bold"
                    >
                      {user.name ? user.name[0].toUpperCase() : "U"}
                    </button>

                    {/* Dropdown Menu */}
                    {isAvatarMenuOpen && (
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
                          onClick={() => setIsAvatarMenuOpen(false)}
                          className="block px-4 py-3 font-bold uppercase text-sm hover:opacity-80 transition"
                          style={{ color: scheme.accent }}
                        >
                          📊 Dashboard
                        </a>
                        {user.role !== "ADMIN" && (
                          <a
                            href="/user/settings"
                            onClick={() => setIsAvatarMenuOpen(false)}
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
                    )}
                  </div>
                ) : (
                  <>
                    <a
                      href="/auth/login"
                      style={{
                        backgroundColor: scheme.accent,
                        color: "#FFFFFF",
                      }}
                      className="px-6 py-3 font-bold uppercase text-sm hover:opacity-80 transition h-12 flex items-center justify-center cursor-pointer"
                    >
                      Log In
                    </a>
                    <a
                      href="/auth/signup"
                      style={{
                        backgroundColor: scheme.accent,
                        color: "#FFFFFF",
                      }}
                      className="px-6 py-3 font-bold uppercase text-sm hover:opacity-80 transition h-12 flex items-center justify-center cursor-pointer"
                    >
                      Sign Up
                    </a>
                  </>
                )}

                {/* Mobile Menu Toggle */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  style={{
                    backgroundColor: scheme.primaryBg,
                    color: scheme.text,
                  }}
                  className="lg:hidden px-4 py-3 flex items-center justify-center h-12"
                  title="Toggle menu"
                >
                  <div className="space-y-1.5">
                    <div style={{ backgroundColor: scheme.text }} className="w-6 h-1"></div>
                    <div style={{ backgroundColor: scheme.text }} className="w-6 h-1"></div>
                    <div style={{ backgroundColor: scheme.text }} className="w-6 h-1"></div>
                  </div>
                </button>
              </div>
            </div>

            {/* Row 2: Navigation Links - Desktop Only */}
            <div
              className="hidden lg:flex items-center justify-between gap-3 w-full"
              suppressHydrationWarning
            >
              <a
                href="/"
                style={{
                  backgroundColor: scheme.accent,
                  color: "#FFFFFF",
                }}
                className="px-6 py-3 font-bold uppercase text-base hover:opacity-80 transition flex-1 text-center"
              >
                Home
              </a>
              <a
                href="/artists"
                style={{
                  backgroundColor: scheme.accent,
                  color: "#FFFFFF",
                }}
                className="px-6 py-3 font-bold uppercase text-base hover:opacity-80 transition flex-1 text-center"
              >
                Artists
              </a>
              <a
                href="/countries"
                style={{
                  backgroundColor: scheme.accent,
                  color: "#FFFFFF",
                }}
                className="px-6 py-3 font-bold uppercase text-base hover:opacity-80 transition flex-1 text-center"
              >
                Countries
              </a>
              <a
                href="/map"
                style={{
                  backgroundColor: scheme.accent,
                  color: "#FFFFFF",
                }}
                className="px-6 py-3 font-bold uppercase text-base hover:opacity-80 transition flex-1 text-center"
              >
                Map
              </a>
              <a
                href="/years"
                style={{
                  backgroundColor: scheme.accent,
                  color: "#FFFFFF",
                }}
                className="px-6 py-3 font-bold uppercase text-base hover:opacity-80 transition flex-1 text-center"
              >
                Years
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        scheme={scheme}
      />

      {/* Mobile Menu - Fullscreen */}
      {isMobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="fixed inset-0 lg:hidden z-40 flex flex-col"
          style={{
            backgroundImage: `url(${placeholderImg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
          }}
          suppressHydrationWarning
        >
          {/* Gradient overlay for text contrast - much darker */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.75) 50%, rgba(0,0,0,0.85) 100%)",
            }}
          ></div>

          {/* Menu Content */}
          <div className="relative flex flex-col items-center justify-center flex-1 gap-8 p-8 text-center">
            {/* Close Button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center text-white hover:text-orange-500 focus:text-orange-500 transition"
              title="Close menu"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Navigation Links */}
            <a
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-5xl font-bold uppercase text-white hover:text-orange-500 focus:text-orange-500 transition"
            >
              Home
            </a>
            <a
              href="/artists"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-5xl font-bold uppercase text-white hover:text-orange-500 focus:text-orange-500 transition"
            >
              Artists
            </a>
            <a
              href="/countries"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-5xl font-bold uppercase text-white hover:text-orange-500 focus:text-orange-500 transition"
            >
              Countries
            </a>
            <a
              href="/map"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-5xl font-bold uppercase text-white hover:text-orange-500 focus:text-orange-500 transition"
            >
              Map
            </a>
            <a
              href="/years"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-5xl font-bold uppercase text-white hover:text-orange-500 focus:text-orange-500 transition"
            >
              Years
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
