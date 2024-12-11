import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { AvatarOptions } from "@/lib/resizeJpg";
import sharp from 'sharp';

const s3 = new S3Client({
	region: process.env.AWS_REGION!,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
	},
});

/**
 * Options for resizing a JPG image.
 */
export interface ResizeJpgOptions {
    buffer: Buffer;
    width: number;
    height: number;
    placement: 'center' | 'top' | 'bottom';
    fit: 'cover' | 'contain';
    backgroundColor: string;
}

/**
 * Handles POST requests for avatar uploads
 * @param req - The incoming HTTP request containing the avatar image file
 * @returns A JSON response with the uploaded avatar URL or an error message
 */
export async function POST(req: Request) {
    try {
        const formData = await req.formData(); // Get form data from the request
        const file = formData.get('file') as File; // Get the uploaded file
        const options = formData.get('options'); // Get the options


        if (!options || typeof options !== 'string') {
            return new Response('No options provided or invalid format', { status: 400 });
        }

        const accountOptions : AvatarOptions = JSON.parse(options);

        if (!file) {
            return new Response('No file uploaded', { status: 400 });
        }

        if (!file.type.startsWith('image/')) {
            return new Response('File must be an image', { status: 400 });
        }

        const imageBlob = await file.arrayBuffer(); // Convert file to ArrayBuffer
        const buffer = Buffer.from(imageBlob); // Convert ArrayBuffer to Buffer

        const fileExtension = "jpg";
        const fileName = `${Date.now()}.${uuidv4()}.${fileExtension}`;

        // Resize options
        const resizeOptions: ResizeJpgOptions = {
            buffer: buffer, // Pass the buffer directly
            width: 256, // Set desired width
            height: 256, // Set desired height
            ...accountOptions
        };

        const resizedBlob = await serverResizeJpg(resizeOptions);
        // Convert file to buffer
        const resizedBuffer = Buffer.from(await resizedBlob.arrayBuffer());

        // Upload to S3
        const command = new PutObjectCommand({
            Bucket: process.env.S3_AVATARS_BUCKET_NAME!,
            Key: fileName,
            Body: resizedBuffer,
            ContentType: "image/jpeg",
        });

        await s3.send(command);

        const avatarUrl = `https://${process.env.S3_AVATARS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

        return NextResponse.json({ url: avatarUrl });
    } catch (error) {
        console.error("Error uploading avatar:", error);
        return NextResponse.json(
            { error: "Error uploading avatar" },
            { status: 500 }
        );
    }
}

/**
 * Resizes a JPG image on the server using the sharp library.
 * 
 * @param {ResizeJpgOptions} options - The options for resizing the image.
 * @param {string} options.path - The file path of the image to resize.
 * @param {number} options.width - The desired width of the resized image.
 * @param {number} options.height - The desired height of the resized image.
 * @param {'center' | 'top' | 'bottom'} [options.placement='center'] - The placement of the image within the resized dimensions.
 * @param {'cover' | 'contain'} [options.fit='cover'] - The fit mode for resizing the image.
 * @param {string} [options.backgroundColor='#000'] - The background color to use when the image does not fill the dimensions.
 * @returns {Promise<Blob>} A promise that resolves to a Blob containing the resized image.
 */
export async function serverResizeJpg({ 
    buffer, 
    width, 
    height, 
    placement = 'center', 
    fit = 'cover', 
    backgroundColor = '#000' }: ResizeJpgOptions)
    : Promise<Blob> {
    // ... existing code ...

    // Replace the image loading and canvas creation with sharp
    const imageBuffer = await sharp(buffer)
        .resize(width, height, {
            fit: fit === 'cover' ? sharp.fit.cover : sharp.fit.contain,
            position: placement,
            background: backgroundColor
        })
        .toBuffer();

    // Convert buffer to Blob
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
    return blob; // Return the Blob directly
}