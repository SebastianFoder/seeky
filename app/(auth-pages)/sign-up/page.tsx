import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import Link from "next/link";

export default async function Signup(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  if ("message" in searchParams) {
    return (
      <div>
        <FormMessage message={searchParams} />
      </div>
    );
  }

  return (
    <form className="auth-form" action={signUpAction}>
      <h1 className="title">Sign up</h1>
      <p className="signup-text">
        Already have an account?{" "}
        <Link href="/sign-in">
          Sign in
        </Link>
      </p>
      <div className="form-group">
        <div className="input-group">
          <label className="label" htmlFor="username">Username</label>
          <input 
            className="input"
            name="username" 
            placeholder="Username" 
            required 
          />
        </div>
        <div className="input-group">
          <label className="label" htmlFor="password">Password</label>
          <input
            className="input"
            type="password"
            name="password"
            placeholder="Password"
            minLength={6}
            required
          />
        </div>
        <SubmitButton className="btn" formAction={signUpAction} pendingText="Signing up...">
          Sign up
        </SubmitButton>
        <FormMessage message={searchParams} />
      </div>
    </form>
  );
}
