import {
  Alert,
  AlertDescription,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@english-coach/ui";
import { Link } from "@tanstack/react-router";
import { type FieldError, type FieldErrors, type Resolver, useForm } from "react-hook-form";
import { z } from "zod";
import { useSignInMutation } from "../mutations";
import { AuthShell } from "./auth-shell";

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const loginResolver: Resolver<LoginFormValues> = async (values) => {
  const result = loginSchema.safeParse(values);

  if (result.success) {
    return {
      errors: {},
      values: result.data,
    };
  }

  const errors: Partial<Record<keyof LoginFormValues, FieldError>> = {};

  for (const issue of result.error.issues) {
    const fieldName = issue.path[0];

    if (fieldName !== "email" && fieldName !== "password") {
      continue;
    }

    if (errors[fieldName]) {
      continue;
    }

    errors[fieldName] = {
      message: issue.message,
      type: "zod",
    };
  }

  return {
    errors: errors as FieldErrors<LoginFormValues>,
    values: {},
  };
};

export function LoginForm() {
  const signInMutation = useSignInMutation();
  const form = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
    resolver: loginResolver,
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    signInMutation.reset();
    await signInMutation.mutateAsync(values);
  });

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in with your email and password. Once the session updates, the router will send you to the correct area based on your current access state."
      footer={
        <p>
          Need an account?{" "}
          <Link className="font-medium text-slate-950 underline underline-offset-4" to="/signup">
            Create one here
          </Link>
          .
        </p>
      }
    >
      <Form {...form}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-950">Login</h2>
            <p className="text-sm text-slate-600">Use the same credentials you created with Better Auth.</p>
          </div>
          {signInMutation.error ? (
            <Alert variant="destructive">
              <AlertDescription>{signInMutation.error.message}</AlertDescription>
            </Alert>
          ) : null}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input autoComplete="email" placeholder="you@example.com" type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input autoComplete="current-password" placeholder="Enter your password" type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button className="w-full" disabled={signInMutation.isPending} type="submit">
            {signInMutation.isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
