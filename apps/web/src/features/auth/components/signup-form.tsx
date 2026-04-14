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
import { useSignUpMutation } from "../mutations";
import { AuthShell } from "./auth-shell";

const signupSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
});

type SignupFormValues = z.infer<typeof signupSchema>;

const signupResolver: Resolver<SignupFormValues> = async (values) => {
  const result = signupSchema.safeParse(values);

  if (result.success) {
    return {
      errors: {},
      values: result.data,
    };
  }

  const errors: Partial<Record<keyof SignupFormValues, FieldError>> = {};

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
    errors: errors as FieldErrors<SignupFormValues>,
    values: {},
  };
};

export function SignupForm() {
  const signUpMutation = useSignUpMutation();
  const form = useForm<SignupFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
    resolver: signupResolver,
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    signUpMutation.reset();
    await signUpMutation.mutateAsync(values);
  });

  return (
    <AuthShell
      title="Create your account"
      description="New registrations flow through the existing Better Auth bootstrap. Student accounts stay conservative by default and should land on the pending state once the session refreshes."
      footer={
        <p>
          Already have an account?{" "}
          <Link className="font-medium text-slate-950 underline underline-offset-4" to="/login">
            Sign in
          </Link>
          .
        </p>
      }
    >
      <Form {...form}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-950">Sign up</h2>
            <p className="text-sm text-slate-600">Use your email and a password to start a student account.</p>
          </div>
          {signUpMutation.error ? (
            <Alert variant="destructive">
              <AlertDescription>{signUpMutation.error.message}</AlertDescription>
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
                  <Input autoComplete="new-password" placeholder="Create a password" type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button className="w-full" disabled={signUpMutation.isPending} type="submit">
            {signUpMutation.isPending ? "Creating account..." : "Create account"}
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
