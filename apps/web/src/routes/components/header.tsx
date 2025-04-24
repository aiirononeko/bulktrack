import { SignInButton, SignedIn, SignedOut } from "@clerk/react-router";
import { Link } from "react-router";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

export default function Header() {
  return (
    <header className="flex items-center justify-between py-4 px-4 border-b">
      <Button variant="ghost" asChild>
        <Link to="/" className="text-xl font-bold text-gray-800">
          BulkTrack
        </Link>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="メニューを開閉する">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <title>メニューを開閉</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <SignedOut>
            <DropdownMenuItem asChild>
              <SignInButton>
                <button type="button" className="w-full text-left">
                  ログイン
                </button>
              </SignInButton>
            </DropdownMenuItem>
          </SignedOut>
          <SignedIn>
            <DropdownMenuItem asChild>
              <Link to="/mypage">マイページ</Link>
            </DropdownMenuItem>
          </SignedIn>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
