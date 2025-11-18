export function Navigation() {
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <a href="/" className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">Wandergraff</span>
            </a>
          </div>

          <div className="flex items-center space-x-4">
            <a
              href="/"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
            >
              Home
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
