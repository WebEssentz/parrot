// This layout will check for the authRedirect flag and route to /auth/callback if needed
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // (Moved to root layout)

  return <>{children}</>;
}
