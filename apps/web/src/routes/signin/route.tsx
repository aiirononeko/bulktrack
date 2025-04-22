import { SignIn } from "@clerk/react-router";

export default function SignInRoute() {
  // path と routing="path" は、Clerk が現在のパスに基づいて動作するために重要
  // signUpUrl は、SignIn コンポーネント内のサインアップリンクの遷移先
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <SignIn path="/signin" routing="path" signUpUrl="/signup" fallbackRedirectUrl="/" />
    </div>
  );
}
