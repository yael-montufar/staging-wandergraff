import { type LoaderFunction } from "react-router";

export const loader: LoaderFunction = async () => {
  const { prismaClient } = await import("~/lib/db.server");

  try {
    const prisma = await prismaClient();

    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { users: allUsers };
  } catch (error) {
    console.error("[DEBUG] Error:", error);
    return { error: String(error) };
  }
};

import { useLoaderData } from "react-router";

type User = {
  id: string;
  email: string;
  name?: string;
  role: string;
};

type LoaderData = {
  users?: User[];
  error?: string;
};

export default function AdminDebug() {
  const data = useLoaderData<LoaderData>();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">🔧 Admin Debug</h1>

        {data.error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">{data.error}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    ID
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.users?.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-900">
                      <code className="bg-gray-100 px-2 py-1 rounded">{user.email}</code>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{user.name || "-"}</td>
                    <td className="px-6 py-3 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.role === "ADMIN"
                            ? "bg-green-100 text-green-800"
                            : user.role === "ARTIST"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500 font-mono">
                      {user.id.slice(0, 8)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8">
          <a href="/" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
