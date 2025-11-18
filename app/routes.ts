import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("auth/login", "routes/auth.login.tsx"),
  route("auth/signup", "routes/auth.signup.tsx"),
  route("auth/logout", "routes/auth.logout.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),
  route("api/auth/create-user", "routes/api.auth.create-user.tsx"),
  route("api/artwork/upload", "routes/api.artwork.upload.tsx"),
  route("artwork/register", "routes/artwork.register.tsx"),
  route("artwork/upload", "routes/artwork.upload.tsx"),
  route("artwork/:id", "routes/artwork.$id.tsx"),
  route("uploads/:filename", "routes/uploads.$filename.tsx"),
] satisfies RouteConfig;
