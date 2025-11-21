import { useState, useEffect } from "react";
import type { Route } from "./+types/test.header";

// Color schemes - Urban palette from styleguide (Light & Dark modes)
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

// Recommended fonts for the logo - wide/blocky display fonts similar to Bebas Neue
const logoFonts = [
  { name: "Bebas Neue", family: "'Bebas Neue', 'Arial Black', sans-serif", weight: 700 },
  { name: "Impact", family: "'Impact', 'Arial Black', sans-serif", weight: 900 },
  { name: "Arial Black", family: "'Arial Black', 'Arial', sans-serif", weight: 900 },
  { name: "Trebuchet Bold", family: "'Trebuchet MS', sans-serif", weight: 900 },
  { name: "Oswald", family: "'Oswald', sans-serif", weight: 700 },
  { name: "Playfair Bold", family: "'Playfair Display', serif", weight: 900 },
  { name: "Courier Bold", family: "'Courier New', monospace", weight: 700 },
];

export const meta: Route.MetaFunction = () => {
  return [{ title: "Header Component Test" }];
};

// Grainy texture SVG pattern
const GrainPattern = () => (
  <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg" style={{ display: "none" }}>
    <defs>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
        <feColorMatrix in="noise" type="saturate" values="0" />
        <feBlend in="SourceGraphic" in2="noise" mode="overlay" />
      </filter>
    </defs>
  </svg>
);

export default function HeaderTestPage() {
  const [selectedScheme, setSelectedScheme] = useState<keyof typeof colorSchemes>("light");
  const [selectedFont, setSelectedFont] = useState(0);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true); // Toggle this to test logged in/out states

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

  const handleThemeChange = (newTheme: keyof typeof colorSchemes) => {
    setSelectedScheme(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("wandergraff-theme", newTheme);
    }
  };

  const noiseColor = selectedScheme === "light" ? "E7E7E7" : "1A1A1A";

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
      <GrainPattern />


      {/* Header Component */}
      <header
        className="border-b-2"
        suppressHydrationWarning
        style={{
          backgroundColor: scheme.secondaryBg,
          borderColor: scheme.text,
        }}
      >
        <div className="max-w-full mx-auto">
          {/* Logo Section - Large and Bold */}
          <div
            className="px-4 sm:px-6 lg:px-8 pt-4 pb-2 text-center"
            suppressHydrationWarning
          >
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
          </div>

          {/* Tagline Section */}
          <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-4 text-center border-b-2" suppressHydrationWarning style={{ borderColor: scheme.divider }}>
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

          {/* Search Bar, Controls, and Navigation Links - Balanced Layout */}
          <div
            className="px-4 sm:px-6 lg:px-8 py-6"
            suppressHydrationWarning
          >
            <div className="flex flex-col gap-3">
              {/* Row 1: Search Bar + Controls */}
              <div className="flex flex-wrap gap-3 items-stretch justify-center w-full">
                {/* Search Bar - Grows to fill space */}
                <div className="flex flex-grow min-w-[280px] basis-[400px]">
                  <input
                    type="text"
                    placeholder="Search"
                    style={{
                      backgroundColor: scheme.primaryBg,
                      color: scheme.text,
                    }}
                    className="flex-1 px-6 py-3 placeholder-opacity-60 focus:outline-none h-12"
                  />
                  <button
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

                {/* Controls Group - Theme Toggle, Social, Auth/Avatar */}
                <div className="flex items-stretch flex-wrap justify-center gap-3">
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

                  {/* Auth Buttons (when logged out) or Avatar (when logged in) */}
                  {!isLoggedIn ? (
                    <>
                      <button
                        onClick={() => setIsLoggedIn(true)}
                        style={{
                          backgroundColor: scheme.accent,
                          color: "#FFFFFF",
                        }}
                        className="px-6 py-3 font-bold uppercase text-sm hover:opacity-80 transition h-12"
                      >
                        Sign Up
                      </button>
                      <button
                        onClick={() => setIsLoggedIn(true)}
                        style={{
                          backgroundColor: scheme.accent,
                          color: "#FFFFFF",
                        }}
                        className="px-6 py-3 font-bold uppercase text-sm hover:opacity-80 transition h-12"
                      >
                        Log In
                      </button>
                    </>
                  ) : (
                    <div className="relative">
                    <button
                      onClick={() => setIsAvatarMenuOpen(!isAvatarMenuOpen)}
                      style={{
                        backgroundColor: scheme.accent,
                        color: "#FFFFFF",
                      }}
                      className="w-12 h-12 hover:opacity-80 transition flex items-center justify-center font-bold"
                    >
                      Y
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
                            Yael Montufar
                          </p>
                          <p className="text-xs" style={{ color: scheme.divider }}>
                            user@example.com
                          </p>
                        </div>

                        {/* Menu Items */}
                        <a
                          href="#"
                          onClick={() => setIsAvatarMenuOpen(false)}
                          className="block px-4 py-3 font-bold uppercase text-sm hover:opacity-80 transition"
                          style={{ color: scheme.accent }}
                        >
                          📊 Dashboard
                        </a>
                        <a
                          href="#"
                          onClick={() => setIsAvatarMenuOpen(false)}
                          className="block px-4 py-3 font-bold uppercase text-sm hover:opacity-80 transition"
                          style={{ color: scheme.accent }}
                        >
                          ⚙️ Settings
                        </a>

                        {/* Divider */}
                        <div
                          style={{
                            borderTop: `1px solid ${scheme.divider}`,
                          }}
                        ></div>

                        {/* Sign Out */}
                        <button
                          onClick={() => {
                            setIsAvatarMenuOpen(false);
                            setIsLoggedIn(false);
                          }}
                          className="w-full text-left px-4 py-3 font-bold uppercase text-sm hover:opacity-80 transition"
                          style={{ color: scheme.accent }}
                        >
                          👋 Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                  )}

                  <button
                    style={{
                      backgroundColor: scheme.primaryBg,
                      color: scheme.text,
                    }}
                    className="lg:hidden px-4 py-3 flex items-center justify-center h-12"
                  >
                    <div className="space-y-1.5">
                      <div style={{ backgroundColor: scheme.text }} className="w-6 h-1"></div>
                      <div style={{ backgroundColor: scheme.text }} className="w-6 h-1"></div>
                      <div style={{ backgroundColor: scheme.text }} className="w-6 h-1"></div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Row 2: Navigation Links - Desktop Only, spans full width to match above */}
              <div
                className="hidden lg:flex items-center justify-between gap-3 w-full"
                suppressHydrationWarning
              >
                {["Home", "Artists", "Countries", "Map", "Years", "Collections", "About"].map((link) => (
                  <a
                    key={link}
                    href={link === "Home" ? "/" : `/${link.toLowerCase()}`}
                    style={{
                      backgroundColor: scheme.accent,
                      color: "#FFFFFF",
                    }}
                    className="px-6 py-3 font-bold uppercase text-base hover:opacity-80 transition flex-1 text-center"
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sample Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div
          className="border-2 p-8"
          suppressHydrationWarning
          style={{
            backgroundColor: scheme.secondaryBg,
            borderColor: scheme.text,
          }}
        >
          <h2 className="text-3xl font-bold mb-4" style={{ color: scheme.text }}>
            Header Component Test
          </h2>
          <p className="mb-6" style={{ color: scheme.divider }}>
            The header above uses the <strong>Urban</strong> color palette from the styleguide.
            It features high contrast, technical typography, and a minimalist grid-based layout.
          </p>

          <div
            className="border-2 p-6"
            suppressHydrationWarning
            style={{
              backgroundColor: scheme.primaryBg,
              borderColor: scheme.divider,
            }}
          >
            <h3 className="font-bold text-lg mb-4" style={{ color: scheme.text }}>
              Urban Color Palette
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border-2 p-4" suppressHydrationWarning style={{ borderColor: scheme.divider }}>
                <p style={{ color: scheme.divider }} className="text-xs font-bold uppercase mb-2">
                  Primary Background
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-12 h-12 border-2"
                    suppressHydrationWarning
                    style={{ backgroundColor: scheme.primaryBg, borderColor: scheme.text }}
                  />
                  <code style={{ color: scheme.text }} className="font-mono">
                    {scheme.primaryBg}
                  </code>
                </div>
              </div>

              <div className="border-2 p-4" suppressHydrationWarning style={{ borderColor: scheme.divider }}>
                <p style={{ color: scheme.divider }} className="text-xs font-bold uppercase mb-2">
                  Text / Key Elements
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-12 h-12 border-2"
                    suppressHydrationWarning
                    style={{ backgroundColor: scheme.text, borderColor: scheme.divider }}
                  />
                  <code style={{ color: scheme.text }} className="font-mono">
                    {scheme.text}
                  </code>
                </div>
              </div>

              <div className="border-2 p-4" suppressHydrationWarning style={{ borderColor: scheme.divider }}>
                <p style={{ color: scheme.divider }} className="text-xs font-bold uppercase mb-2">
                  Accent / Action Color
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-12 h-12 border-2"
                    suppressHydrationWarning
                    style={{ backgroundColor: scheme.accent, borderColor: scheme.text }}
                  />
                  <code style={{ color: scheme.text }} className="font-mono">
                    {scheme.accent}
                  </code>
                </div>
              </div>

              <div className="border-2 p-4" suppressHydrationWarning style={{ borderColor: scheme.divider }}>
                <p style={{ color: scheme.divider }} className="text-xs font-bold uppercase mb-2">
                  Dividers / Secondary Text
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-12 h-12 border-2"
                    suppressHydrationWarning
                    style={{ backgroundColor: scheme.divider, borderColor: scheme.text }}
                  />
                  <code style={{ color: scheme.text }} className="font-mono">
                    {scheme.divider}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
