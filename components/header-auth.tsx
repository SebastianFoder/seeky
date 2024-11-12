import { signOutAction } from "@/app/actions";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function AuthButton() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? (
    <>
      <form className="btn" action={signOutAction}>
        <button className="btn btn-dark-primary shadow" type="submit">
          Sign out
        </button>
      </form>
    </>
  ) : (
    <>
      <Link className="btn btn-primary shadow" href="/sign-in">Sign in</Link>
      <Link className="btn btn-dark-primary shadow" href="/sign-up">Sign up</Link>
    </>
  );
}
