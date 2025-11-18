import { type ActionFunction, redirect } from "react-router";

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return { error: "Method not allowed" };
  }

  const response = redirect("/");
  response.headers.set("Set-Cookie", "auth-token=; Path=/; Max-Age=0");
  return response;
};

export default function LogoutPage() {
  return null;
}
