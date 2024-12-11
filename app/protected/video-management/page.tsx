import VideoList from "@/components/video-list";
import { accountService } from "@/services/accountService";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function VideoManagementPage() {
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
        <div>
            <VideoList accountId={user.id} />
        </div>
    );
}