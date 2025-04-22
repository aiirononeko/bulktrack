import type { RouteConfig } from "@react-router/dev/routes";
import { index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index/route.tsx"),

  route("menus", "routes/menus/route.layout.tsx", [
    index("routes/menus/_index/route.tsx"),
    route("new", "routes/menus/new/route.tsx"),
    route(":menuId/edit", "routes/menus/$menuId/edit/route.tsx"),
  ]),

  route("workouts", "routes/workouts/route.tsx", [
    index("routes/workouts/_index/route.tsx"),
    route("new", "routes/workouts/new/route.tsx"),
    route(":id", "routes/workouts/$id/route.tsx"),
    route("new/:menuId", "routes/workouts/new/$menuId/route.tsx"),
  ]),
] satisfies RouteConfig;
