import { createClerkClient } from "@clerk/react-router/api.server";
import { getAuth } from "@clerk/react-router/ssr.server";
import { type LoaderFunctionArgs, redirect } from "react-router";

export async function loader(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);

  // 未認証の場合はサインインページへリダイレクト
  if (!userId) {
    const searchParams = new URLSearchParams([["redirect_url", args.request.url]]);
    return redirect(`/signin?${searchParams.toString()}`);
  }

  const user = await createClerkClient({
    secretKey: args.context?.cloudflare?.env.CLERK_SECRET_KEY,
  }).users.getUser(userId);

  return { user };
}
