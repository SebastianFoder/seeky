import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const file = formData.get("file") as File;
		const videoId = formData.get("videoId") as string;
		const userId = formData.get("userId") as string;

		if (!file) {
			return NextResponse.json(
				{ error: "No file provided" },
				{ status: 400 }
			);
		}

		if (!videoId) {
			return NextResponse.json(
				{ error: "No videoId provided" },
				{ status: 400 }
			);
		}

		const processingId = generateProcessingId(userId);
		formData.append('processingId', processingId);

		const supabase = await createClient();

		const { data, error: insertError } = await supabase
			.from('video_processing_tickets')
			.insert([
				{
					processing_id: processingId,
					user_id: userId,
					video_id: videoId,
				}
			]);

		if (insertError) {
			console.error("Error inserting processing ticket:", insertError);
			return NextResponse.json(
				{ error: "Error creating processing ticket" },
				{ status: 500 }
			);
		}
		console.log('Sending to video processing');
		await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/videoprocessing`, formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		});
		console.log('Sent to video processing');

		return NextResponse.json({ status: 'processing', videoId, processingId });

	} catch (error) {
		console.error("Error uploading video:", error);
		return NextResponse.json(
			{ error: "Error uploading video" },
			{ status: 500 }
		);
	}
}

function generateProcessingId(userId: string) {
    return 'proc_' + Date.now() + '_' + uuidv4() + '_' + userId;
}