"use client";

import { useUser } from "@clerk/nextjs";
import { SpinnerIcon } from "@/components/icons";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/auth/logo";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon } from "lucide-react";
// import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  dob: z.date({
    required_error: "A date of birth is required.",
  }),
});

function UnifiedProfileForm({ defaultUsername, defaultDob, onSubmit, loading }: {
  defaultUsername: string;
  defaultDob: Date | undefined;
  onSubmit: (data: { username: string; dob: Date }) => Promise<void>;
  loading: boolean;
}) {
  const form = useForm<z.infer<typeof UnifiedFormSchema>>({
    resolver: zodResolver(UnifiedFormSchema),
    defaultValues: {
      username: defaultUsername,
      dob: defaultDob,
    },
  });

  // Async username uniqueness check
  const validateUsernameUnique = async (username: string) => {
    if (!usernameRegex.test(username)) return false;
    // Call API to check uniqueness
    try {
      const res = await fetch(`/api/users?username=${encodeURIComponent(username)}`);
      if (!res.ok) return false;
      const data = await res.json();
      // If data.exists is true, username is taken
      return !data.exists;
    } catch {
      return false;
    }
  };

  // Add custom validation for username uniqueness
  const usernameField = form.register("username", {
    validate: async (value: string) => {
      if (!usernameRegex.test(value)) {
        toast("Invalid username", {
          description: "Username can only contain letters, numbers, underscores (_), and hyphens (-). No spaces or other special characters.",
          duration: 4000,
        });
        return "Username can only contain letters, numbers, underscores (_), and hyphens (-).";
      }
      const unique = await validateUsernameUnique(value);
      if (!unique) {
        toast("Username taken", {
          description: "This username is already taken. Please choose another.",
          duration: 4000,
        });
        return "This username is already taken.";
      }
      return true;
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8"
      >
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="shadcn" {...field} {...usernameField} />
              </FormControl>
              <FormDescription>
                This is your public display name. Only letters, numbers, _ and - allowed. No spaces. Must be unique.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dob"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of birth</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        field.value.toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  disabled={(date: Date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                  initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                Your date of birth is used to calculate your age.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? "Loading..." : "Continue"}
        </Button>
      </form>
    </Form>
  );
}

export default function AboutYouPage() {
  const router = useRouter();
  const { isLoaded: clerkLoaded, isSignedIn } = useUser();
  const [birthday, setBirthday] = useState<Date | undefined>(undefined);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [dbLoaded, setDbLoaded] = useState(false);

  // Check auth state and redirect as needed
  useEffect(() => {
    if (!clerkLoaded) return;
    if (isSignedIn) {
      router.replace("/");
      return;
    }
    // Not signed in, check for pendingUser
    const data = localStorage.getItem("pendingUser");
    if (data) {
      setUser(JSON.parse(data));
      setDbLoaded(true);
    } else {
      router.replace("/sign-up");
    }
  }, [clerkLoaded, isSignedIn, router]);

  const handleUnifiedSubmit = async (data: { username: string; dob: Date }) => {
    setLoading(true);
    setError("");
    try {
      setUsername(data.username);
      setBirthday(data.dob);
      // Update localStorage with new fields
      const pendingUser = localStorage.getItem("pendingUser");
      let userObj = pendingUser ? JSON.parse(pendingUser) : {};
      userObj.username = data.username;
      userObj.birthday = data.dob;
      localStorage.setItem("pendingUser", JSON.stringify(userObj));

      // Push all fields to db
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname: userObj.firstname,
          lastname: userObj.lastname,
          email: userObj.email,
          username: userObj.username,
          profilePic: userObj.profilePic,
          birthday: userObj.birthday,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create user.");
        setLoading(false);
        return;
      }
      localStorage.removeItem("pendingUser");
      router.replace("/");
    } catch (err) {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  // Show spinner while loading Clerk or DB
  if (!clerkLoaded || !dbLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full animate-spin">
        <SpinnerIcon size={48} className="text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen relative pt-16">
      {/* Brand Logo Header */}
      <Link href="/" className="absolute top-5 left-6 z-50">
        <BrandLogo />
      </Link>
      <h2 className="text-3xl font-semibold text-center mb-8">Tell us about you</h2>
      <div className="w-full max-w-sm flex flex-col gap-6 bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-md">
        <UnifiedProfileForm
          defaultUsername={username}
          defaultDob={birthday}
          onSubmit={handleUnifiedSubmit}
          loading={loading}
        />
        {error && (
          <div className="text-red-500 text-sm mt-2">{error}</div>
        )}
      </div>
    </div>
  );
}
