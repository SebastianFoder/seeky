import VideoUpload from "@/components/upload";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function Upload() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return <div>Please sign in to upload a video.</div>;
    }

    return <VideoUpload userId={user.id} />;
}