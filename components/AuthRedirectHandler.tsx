"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthRedirectHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if ((pathname === "/auth/sign-in" || pathname === "/auth/sign-up") && typeof window !== "undefined") {
      if (localStorage.getItem("authRedirect") === "true") {
        localStorage.removeItem("authRedirect");
        router.replace("/auth/callback");
      }
    }
  }, [pathname, router]);

  return null;
}
