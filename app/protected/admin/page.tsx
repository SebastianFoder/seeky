import ManageVideos from "@/components/ManageVideos";
import { accountService } from "@/services/accountService";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminPage() {
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

    if (account.role !== "admin") {
        return redirect("/");
    }


    return <ManageVideos />;
}