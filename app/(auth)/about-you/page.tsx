"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns"; // Use date-fns for formatting

import { BrandLogo } from "@/components/auth/logo";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import 'react-day-picker/dist/style.css';

// Unified form schema
const usernameRegex = /^[a-zA-Z0-9_-]+$/;
const UnifiedFormSchema = z.object({
  username: z
    .string()
    .min(2, { message: "Username must be at least 2 characters." })
    .max(32, { message: "Username must be at most 32 characters." })
    .regex(usernameRegex, {
      message:
        "Username can only contain letters, numbers, underscores (_), and hyphens (-).",
    }),
  dob: z.date({
    required_error: "A date of birth is required.",
  }),
});

type UnifiedFormValues = z.infer<typeof UnifiedFormSchema>;

export default function AboutYouPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const currentYear = new Date().getFullYear();

  const form = useForm<UnifiedFormValues>({
    resolver: zodResolver(UnifiedFormSchema),
    defaultValues: {
      username: "",
      dob: undefined,
    },
  });

  // Effect to populate form with data from localStorage
  useEffect(() => {
    const data = localStorage.getItem("pendingUser");
    if (data) {
      const parsedUser = JSON.parse(data);
      form.reset({
          username: parsedUser.username || "",
          dob: parsedUser.birthday ? new Date(parsedUser.birthday) : undefined,
      });
    } else {
      router.replace("/auth/sign-in");
    }
  }, [router, form.reset]); // form.reset is stable, dependency is fine

  // Submission handler
  const onSubmit = async (formData: UnifiedFormValues) => {
    setLoading(true);
    setApiError("");
    try {
      const pendingUser = localStorage.getItem("pendingUser");
      let userObj = pendingUser ? JSON.parse(pendingUser) : {};

      userObj.username = formData.username;
      userObj.birthday = formData.dob.toISOString();
      localStorage.setItem("pendingUser", JSON.stringify(userObj));

      const payload = {
        firstname: userObj.firstName || userObj.firstname || "",
        lastname: userObj.lastName || userObj.lastname || "",
        email: userObj.email,
        username: userObj.username,
        profilePic: userObj.imageUrl || userObj.profilePic || null,
        birthday: userObj.birthday,
      };

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        const errorMessage = errorData.error || "Failed to create user.";
        if (errorMessage.toLowerCase().includes("username")) {
          form.setError("username", {
            type: "manual",
            message: "This username is already taken. Please choose another.",
          });
        } else {
          setApiError(errorMessage);
        }
        setLoading(false);
        return;
      }

      localStorage.removeItem("pendingUser");
      router.replace("/");
    } catch (err) {
      setApiError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen relative pt-16 bg-background">
      <Link href="/" className="absolute top-5 left-6 z-50">
        <BrandLogo />
      </Link>
      <h2 className="text-3xl font-semibold text-center mb-8">Tell us about you</h2>
      <div className="w-full max-w-sm bg-card text-card-foreground p-6 rounded-xl shadow-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Your unique username" {...field} />
                  </FormControl>
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
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        captionLayout="dropdown" // Corrected layout
                        fromYear={1900}
                        toYear={currentYear}
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
              className="w-full cursor-pointer"
              disabled={loading || form.formState.isSubmitting}
            >
              {loading || form.formState.isSubmitting ? "Loading..." : "Continue"}
            </Button>
            {apiError && (
              <p className="text-sm font-medium text-destructive text-center">{apiError}</p>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
}