import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({
	region: process.env.AWS_REGION!,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
	},
});

export async function POST(request: Request) {
	try {
		const formData = await request.formData();
		const file = formData.get("file") as File;
		
		if (!file) {
			return NextResponse.json(
				{ error: "No thumbnail provided" },
				{ status: 400 }
			);
		}

		// Validate file type
		if (!file.type.startsWith('image/')) {
			return NextResponse.json(
				{ error: "File must be an image" },
				{ status: 400 }
			);
		}

		// Generate unique filename
		const fileExtension = file.name.split(".").pop();
		const fileName = `thumbnails/${Date.now()}.${uuidv4()}.${fileExtension}`;

		// Convert file to buffer
		const buffer = Buffer.from(await file.arrayBuffer());

		// Upload to S3
		const command = new PutObjectCommand({
			Bucket: process.env.S3_THUMBNAIL_BUCKET_NAME!,
			Key: fileName,
			Body: buffer,
			ContentType: file.type,
		});

		await s3.send(command);

		return NextResponse.json({ url: fileName });

	} catch (error) {
		console.error("Error uploading thumbnail:", error);
		return NextResponse.json(
			{ error: "Error uploading thumbnail" },
			{ status: 500 }
		);
	}
}


