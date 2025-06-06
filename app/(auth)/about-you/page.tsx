"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/auth/logo";
import { Input } from "@/components/ui/input";
import { CalendarIcon } from "lucide-react";
// import { format } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Calendar from "react-calendar";
import dayjs from "dayjs";
import "react-calendar/dist/Calendar.css";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Unified form schema for both username and dob
const usernameRegex = /^[a-zA-Z0-9_-]+$/;
const UnifiedFormSchema = z.object({
  username: z
    .string()
    .min(2, { message: "Username must be at least 2 characters." })
    .max(32, { message: "Username must be at most 32 characters." })
    .regex(usernameRegex, {
      message:
        "Username can only contain letters, numbers, underscores (_), and hyphens (-). No spaces or other special characters.",
    }),
  dob: z.custom((val) => {
    // Accept both JS Date and Day.js objects
    return dayjs(val).isValid();
  }, { message: "A date of birth is required." }),
});



export default function AboutYouPage() {
  const router = useRouter();
  const [birthday, setBirthday] = useState<Date | undefined>(undefined);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const data = localStorage.getItem("pendingUser");
    if (data) {
      setUser(JSON.parse(data));
    } else {
      router.replace("/auth/sign-in");
    }
  }, [router]);

  const handleUnifiedSubmit = async (data: { username: string; dob?: Date }) => {
    setLoading(true);
    setError("");
    try {
      console.log("[DEBUG] Submitted data:", data);
      setUsername(data.username);
      setBirthday(data.dob);
      // Update localStorage with new fields
      const pendingUser = localStorage.getItem("pendingUser");
      console.log("[DEBUG] pendingUser from localStorage:", pendingUser);
      let userObj = pendingUser ? JSON.parse(pendingUser) : {};
      userObj.username = data.username;
      userObj.birthday = data.dob ? dayjs(data.dob).toISOString() : undefined;
      localStorage.setItem("pendingUser", JSON.stringify(userObj));
      console.log("[DEBUG] Updated userObj:", userObj);

      // Prepare payload
      const payload = {
        firstname: userObj.firstName || userObj.firstname || "",
        lastname: userObj.lastName || userObj.lastname || "",
        email: userObj.email,
        username: userObj.username,
        profilePic: userObj.imageUrl || userObj.profilePic || null,
        birthday: userObj.birthday,
      };
      console.log("[DEBUG] Payload to POST:", payload);

      // Push all fields to db
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log("[DEBUG] Response status:", res.status);
      if (!res.ok) {
        const data = await res.json();
        console.log("[DEBUG] Error response:", data);
        if (data.error && data.error.toLowerCase().includes("username")) {
          toast("Username taken", {
            description: "This username is already taken. Please choose another.",
            duration: 4000,
          });
        }
        setError(data.error || "Failed to create user.");
        setLoading(false);
        return;
      }
      localStorage.removeItem("pendingUser");
      router.replace("/");
    } catch (err) {
      console.log("[DEBUG] Exception:", err);
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen relative pt-16">
      {/* Brand Logo Header */}
      <Link href="/" className="absolute top-5 left-6 z-50">
        <BrandLogo />
      </Link>
      <h2 className="text-3xl font-semibold text-center mb-8">Tell us about you</h2>
      <div className="w-full max-w-sm flex flex-col gap-6 bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-md">
        {/* Simple colorless input UI, no form library */}
        <label className="text-sm font-medium mb-1" htmlFor="username">Username</label>
        <Input
          id="username"
          className="mb-2 bg-transparent text-black dark:text-white"
          placeholder="Your username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoComplete="off"
        />
        <label className="text-sm font-medium mb-1" htmlFor="dob">Date of birth</label>
        <div className="flex items-center gap-2 mb-2">
          <Calendar
            value={birthday ? dayjs(birthday).toDate() : null}
            onChange={date => setBirthday(date as Date)}
            maxDate={new Date()}
            minDate={new Date("1900-01-01")}
          />
          <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
        </div>
        <Button
          className="w-full"
          disabled={loading}
          onClick={() => handleUnifiedSubmit({ username, dob: birthday })}
        >
          {loading ? "Loading..." : "Continue"}
        </Button>
        {error && (
          <div className="text-red-500 text-sm mt-2">{error}</div>
        )}
      </div>
    </div>
  );
}
