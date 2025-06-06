"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import { format } from "date-fns"; // Added for new date picker display

import { BrandLogo } from "@/components/auth/logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription, // Added
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
import { toast } from "sonner";

// Unified form schema
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
    invalid_type_error: "That's not a valid date!",
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

  useEffect(() => {
    const data = localStorage.getItem("pendingUser");
    if (data) {
      const parsedUser = JSON.parse(data);
      if (parsedUser.username) {
        form.setValue("username", parsedUser.username);
      }
      if (parsedUser.birthday) {
        const dobDate = dayjs(parsedUser.birthday).toDate();
        if (dayjs(dobDate).isValid()) {
          form.setValue("dob", dobDate);
        }
      }
    } else {
      router.replace("/auth/sign-in");
    }
  }, [router, form]);

  const onSubmit = async (formData: UnifiedFormValues) => {
    setLoading(true);
    setApiError("");
    try {
      console.log("[DEBUG] Submitted form data:", formData);

      const pendingUser = localStorage.getItem("pendingUser");
      let userObj = pendingUser ? JSON.parse(pendingUser) : {};

      userObj.username = formData.username;
      userObj.birthday = formData.dob ? dayjs(formData.dob).toISOString() : undefined;
      localStorage.setItem("pendingUser", JSON.stringify(userObj));
      console.log("[DEBUG] Updated userObj:", userObj);

      const payload = {
        firstname: userObj.firstName || userObj.firstname || "",
        lastname: userObj.lastName || userObj.lastname || "",
        email: userObj.email,
        username: userObj.username,
        profilePic: userObj.imageUrl || userObj.profilePic || null,
        birthday: userObj.birthday,
      };
      console.log("[DEBUG] Payload to POST:", payload);

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log("[DEBUG] Response status:", res.status);

      if (!res.ok) {
        const errorData = await res.json();
        console.log("[DEBUG] Error response:", errorData);
        if (errorData.error && errorData.error.toLowerCase().includes("username")) {
          form.setError("username", {
            type: "manual",
            message: "This username is already taken. Please choose another.",
          });
          toast("Username taken", {
            description: "This username is already taken. Please choose another.",
            duration: 4000,
          });
        } else {
          setApiError(errorData.error || "Failed to create user.");
        }
        setLoading(false);
        return;
      }

      localStorage.removeItem("pendingUser");
      router.replace("/");
    } catch (err) {
      console.log("[DEBUG] Exception:", err);
      setApiError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen relative pt-16">
      <Link href="/" className="absolute top-5 left-6 z-50">
        <BrandLogo />
      </Link>
      <h2 className="text-3xl font-semibold text-center mb-8">Tell us about you</h2>
      <div className="w-full max-w-sm bg-background p-6 rounded-xl shadow-md"> {/* Use bg-background for theme adaptiveness */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your username"
                      {...field}
                      autoComplete="off"
                    />
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
                            "w-full pl-3 text-left font-normal", // Changed w-[240px] to w-full
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP") // Using date-fns format
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
                        captionLayout="dropdown" // Use allowed value for better UX
                        fromYear={1900} // Set a range for year dropdown
                        toYear={currentYear}   // Set a range for year dropdown
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription> {/* Added FormDescription */}
                    Your date of birth is used to calculate your age.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
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