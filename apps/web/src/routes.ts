import { type RouteConfig, index } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  { path: "workouts", file: "routes/workouts.tsx" },
  { path: "volume-log", file: "routes/volume-log.tsx" },
  { path: "menus", file: "routes/menus.tsx" },
  { path: "menus/new", file: "routes/menus/new.tsx" },
] satisfies RouteConfig;
