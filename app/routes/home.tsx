import { netlifyRouterContext } from "@netlify/vite-plugin-react-router";

import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

// Example middleware that adds a custom header
const customDateHeaderMiddleware: Route.MiddlewareFunction = async (
  _request,
  next,
) => {
  const response = await next();
  response.headers.set("X-Current-Date", new Date().toUTCString());
  return response;
};

// Example middleware that uses Netlify context
const logMiddleware: Route.MiddlewareFunction = async ({
  request,
  context,
}) => {
  try {
    const netlifyContext = context.get(netlifyRouterContext);
    const country = netlifyContext?.geo?.country?.name || "unknown location";
    console.log(
      `Handling ${request.method} request to ${request.url} from ${country}`,
    );
  } catch {
    console.log(`Handling ${request.method} request to ${request.url}`);
  }
};

export const middleware: Route.MiddlewareFunction[] = [
  customDateHeaderMiddleware,
  logMiddleware,
];

export default function Home() {
  return <Welcome />;
}
