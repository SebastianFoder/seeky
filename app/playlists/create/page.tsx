import { accountService } from "@/services/accountService";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import PlaylistCreateComponent from "./component";

export default async function Playlists() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/sign-in");
    }

    const account = await accountService.getAccountByUid(supabase, user.id);

    if (!account) {
        return redirect("/sign-in");
    }

    return (
        <PlaylistCreateComponent />
    );
}