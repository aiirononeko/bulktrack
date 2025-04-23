import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";

import { getMenus } from "~/lib/api";

import type { Route } from "./+types/route";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect(`/signin?redirect_url=${args.request.url}`);
  }

  try {
    const menus = await getMenus(args);
    return { menus };
  } catch (error) {
    console.error("Error fetching menus:", error);
    return { menus: [] };
  }
}
