import { SignUp } from "@clerk/react-router";

export default function SignUpRoute() {
  // path と routing="path" は、Clerk が現在のパスに基づいて動作するために重要
  // signInUrl は、SignUp コンポーネント内のサインインリンクの遷移先
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <SignUp path="/signup" routing="path" signInUrl="/signin" />
    </div>
  );
}
