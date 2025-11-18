import { type LoaderFunction, redirect } from "react-router";

export const loader: LoaderFunction = async () => {
  const { prismaClient } = await import("~/lib/db.server");

  try {
    const prisma = await prismaClient();

    // Set nimda.inmo@gmail.com to ADMIN
    const updated = await prisma.user.update({
      where: { email: "nimda.inmo@gmail.com" },
      data: { role: "ADMIN" },
    });

    console.log("[ADMIN SETUP] Updated user to ADMIN role:", updated.email);

    return { success: true, email: updated.email, role: updated.role, action: "promoted" };
  } catch (error) {
    console.error("[ADMIN SETUP] Error:", error);
    return { error: String(error) };
  }
};

import { useLoaderData } from "react-router";

type SetupData = {
  success?: boolean;
  email?: string;
  role?: string;
  action?: string;
  error?: string;
};

export default function AdminSetup() {
  const data = useLoaderData<SetupData>();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
        {data.error ? (
          <>
            <h1 className="text-2xl font-bold text-red-600 mb-4">❌ Error</h1>
            <p className="text-gray-700 mb-6">{data.error}</p>
          </>
        ) : data.action === "promoted" ? (
          <>
            <h1 className="text-2xl font-bold text-green-600 mb-4">✅ Admin Promoted</h1>
            <p className="text-gray-700 mb-2">
              User <strong>{data.email}</strong>
            </p>
            <p className="text-gray-700 mb-6">
              Role: <strong>{data.role}</strong>
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Please log out and back in to see the admin dashboard.
            </p>
          </>
        ) : data.action === "reverted" ? (
          <>
            <h1 className="text-2xl font-bold text-blue-600 mb-4">✅ User Reverted</h1>
            <p className="text-gray-700 mb-2">
              User <strong>{data.email}</strong>
            </p>
            <p className="text-gray-700 mb-6">
              Role: <strong>{data.role}</strong>
            </p>
            <p className="text-sm text-gray-600 mb-6">
              User has been reverted to regular user.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-green-600 mb-4">✅ Admin Setup Complete</h1>
            <p className="text-gray-700 mb-2">
              User <strong>{data.email}</strong>
            </p>
            <p className="text-gray-700 mb-6">
              Role: <strong>{data.role}</strong>
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Please log out and back in to see the admin dashboard.
            </p>
          </>
        )}
        <a
          href="/"
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Back to Home
        </a>
        <p className="text-xs text-gray-500 mt-6">
          Note: This route can be deleted after setup is complete.
        </p>
      </div>
    </div>
  );
}
