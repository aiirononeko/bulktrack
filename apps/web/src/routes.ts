import type { RouteConfig } from "@react-router/dev/routes";
import { index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index/route.tsx"),

  route("workouts", "routes/workouts/route.tsx", [
    index("routes/workouts/_index/route.tsx"),
    route("new", "routes/workouts/new/route.tsx"),
    route(":id", "routes/workouts/$id/route.tsx"),
  ]),
] satisfies RouteConfig;
