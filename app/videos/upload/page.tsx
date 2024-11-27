import VideoUpload from "@/components/video-upload";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function Upload() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        redirect("/sign-in");
    }

    return <VideoUpload userId={user.id} />;
}