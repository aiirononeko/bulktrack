import type { RouteConfig } from "@react-router/dev/routes";
import { flatRoutes } from "@react-router/fs-routes";

export default (await flatRoutes({
  rootDirectory: "routes",
})) satisfies RouteConfig;
