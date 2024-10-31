import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import Link from "next/link";

export default async function Login(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;
  return (
    <form>
      <h1>Sign in</h1>
      <p>
        Don't have an account?{" "}
        <Link href="/sign-up">
          Sign up
        </Link>
      </p>
      <div>
        <label htmlFor="username">Username</label>
        <input name="username" placeholder="username" required />
        <div>
          <label htmlFor="password">Password</label>
          <Link
            href="/forgot-password"
          >
            Forgot Password?
          </Link>
        </div>
        <input
          type="password"
          name="password"
          placeholder="Your password"
          required
        />
        <SubmitButton pendingText="Signing In..." formAction={signInAction}>
          Sign in
        </SubmitButton>
        <FormMessage message={searchParams} />
      </div>
    </form>
  );
}
