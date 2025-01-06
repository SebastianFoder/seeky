import { Video } from "@/types/video";
import { createClient } from "@/utils/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const id = (await params).id;

		const supabase = await createClient();

		const { data: videoData, error: videoError } = await supabase.from('videos').select('*').eq('id', id).single();
		const video = videoData as Video;

		if (videoError || !video) {
			return NextResponse.json({ error: "Video not found" }, { status: 404 });
		}
		const deletePromises: Promise<any>[] = [
			deleteVideoFilesFromApi(id),
			deletePreviewFromApi(video),
			deleteThumbnailFromApi(video)
		];

		await Promise.all(deletePromises);

		await deleteVideoFromSupabase(id, supabase);

		return NextResponse.json({ message: "Video deleted successfully", video });
	} catch (error) {
		console.error("Error deleting video versions:", error);
		return NextResponse.json(
			{ error: "Error deleting video versions" },
			{ status: 500 }
		);
	}
}

async function deleteVideoFromSupabase(id: string, supabase: SupabaseClient) {
    await supabase.from('videos').delete().eq('id', id);
}

async function deleteVideoFilesFromApi(id: string) {
    await axios.delete(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/videoprocessing/${id}`);
}

async function deletePreviewFromApi(video: Video) {
    await axios.delete(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/preview/${video.metadata?.previewGifURL?.split('/').pop()}`);
}

async function deleteThumbnailFromApi(video: Video) {
    await axios.delete(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/thumbnail/${video.thumbnail_url?.split('/').pop()}`);
}
