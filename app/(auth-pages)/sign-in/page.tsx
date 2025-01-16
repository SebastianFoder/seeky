import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import Link from "next/link";

export default async function Login(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;

  return (
    <form className="auth-form" action={signInAction}>
      <h1 className="title">Sign in</h1>
      <p className="signup-text">
        Don't have an account?{" "}
        <Link href="/sign-up">Sign up</Link>
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
          <div className="label-wrapper">
            <label className="label" htmlFor="password">Password</label>
            <Link
              className="forgot-password"
              href="/forgot-password"
            >
              Forgot Password?
            </Link>
          </div>
          <input
            className="input"
            type="password"
            name="password"
            placeholder="Password"
            required
          />
        </div>
        <SubmitButton className="btn" pendingText="Signing In...">
          Sign in
        </SubmitButton>
        <FormMessage message={searchParams} />
      </div>
    </form>
  );
}
