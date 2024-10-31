import { signOutAction } from "@/app/actions";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function AuthButton() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const greeting = user?.user_metadata.name ?? user?.email;

  return user ? (
    <div>
      Hey, {greeting}!
      <form action={signOutAction}>
        <button type="submit">
          Sign out
        </button>
      </form>
    </div>
  ) : (
    <div>
      <button>
        <Link href="/sign-in">Sign in</Link>
      </button>
      <button>
        <Link href="/sign-up">Sign up</Link>
      </button>
    </div>
  );
}
