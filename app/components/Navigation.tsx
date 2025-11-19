'use client';

import { UserMenu } from './UserMenu';

type NavigationProps = {
  user?: {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
    role?: string;
  } | null;
};

export function Navigation({ user }: NavigationProps) {
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <a href="/" className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">Wandergraff</span>
            </a>
          </div>

          {/* Center Discovery Links */}
          <div className="hidden md:flex items-center justify-center flex-1 space-x-8">
            <a
              href="/artists"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
            >
              Artists
            </a>
            <a
              href="/countries"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
            >
              Countries
            </a>
            <a
              href="/years"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
            >
              Years
            </a>
            <a
              href="/map"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
            >
              Map
            </a>
            <button
              className="text-gray-600 hover:text-gray-900 p-2"
              title="Search"
              onClick={() => {
                // Search functionality placeholder
                // Will be implemented in phase 2
              }}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          </div>

          {/* Right Auth Section */}
          <div className="flex items-center space-x-4">
            {user ? (
              <UserMenu user={user} />
            ) : (
              <>
                <a
                  href="/auth/login"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                >
                  Sign In
                </a>
                <a
                  href="/auth/signup"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  Sign Up
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
