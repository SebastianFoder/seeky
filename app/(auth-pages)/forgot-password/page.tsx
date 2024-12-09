import { forgotPasswordAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import Link from "next/link";

export default async function ForgotPassword(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  return (
    <form className="auth-form">
      <h1 className="title">Reset Password</h1>
      <p className="signup-text">
        Already have an account?{" "}
        <Link href="/sign-in">
          Sign in
        </Link>
      </p>
      <div className="form-group">
        <div className="input-group">
          <label className="label" htmlFor="email">Email</label>
          <input 
            className="input"
            name="email" 
            placeholder="you@example.com" 
            required 
          />
        </div>
        <SubmitButton className="btn" formAction={forgotPasswordAction}>
          Reset Password
        </SubmitButton>
        <FormMessage message={searchParams} />
      </div>
    </form>
  );
}
