import { createClient } from "@/utils/supabase/server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import naughtyWords from "naughty-words";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({
	region: process.env.AWS_REGION!,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
	},
});

export async function POST(req: NextRequest) {

    const thumbnailAllowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/bmp', 'image/tiff', 'image/tif', 'image/heic', 'image/heif'];

    const errors: string[] = [];
    try {
        const contentType = req.headers.get('content-type');
        if (!contentType?.includes('multipart/form-data')) {
            return NextResponse.json({ errors: ["Content-Type must be multipart/form-data"] }, { status: 400 });
        }

        const formData = await req.formData();
        const title = formData.get('title') as string;
        const visibility = formData.get('visibility') as string;
        const thumbnail = formData.get('thumbnail') as File;
        const userId = formData.get('userId') as string;


        if (!title) {
            errors.push('Title is required');
        } else if (title.length < 3) {
            errors.push('Title must be at least 3 characters long');
        }


        if (!visibility) {
            errors.push('Visibility is required');
        } else if (visibility !== 'public' && visibility !== 'unlisted' && visibility !== 'private') {
            errors.push('Invalid visibility');
        }

        if (!userId) {
            errors.push('User ID is required');
        }

        if (!thumbnail) {
            if(errors.length === 0) {
                const sanitizedTitle = await friendlyText(title);
                const supabase = await createClient();

                const { data, error } = await supabase.from('playlists').insert({
                    title: sanitizedTitle,
                    visibility: visibility,
                    user_id: userId
                }).select();

                console.log(data);

                if (error) {
                    return NextResponse.json({ errors: [error.message] }, { status: 500 });
                }

                return NextResponse.json({ message: 'Playlist created', data: data[0] }, { status: 200 });
            }
        } else if (!thumbnailAllowedTypes.includes(thumbnail.type)) {
            errors.push('Invalid thumbnail type');
        }
        console.log(errors);

        if (errors.length > 0) {
            return NextResponse.json({ errors }, { status: 400 });
        }     
        

        // Generate unique filename
        const fileExtension = thumbnail.name.split(".").pop();
        const fileName = `thumbnails/${Date.now()}.${uuidv4()}.${fileExtension}`;

        // Convert file to buffer
        const buffer = Buffer.from(await thumbnail.arrayBuffer());

        // Upload to S3
        const command = new PutObjectCommand({
            Bucket: process.env.S3_THUMBNAIL_BUCKET_NAME!,
            Key: fileName,
            Body: buffer,
            ContentType: thumbnail.type,
        });

        await s3.send(command);

        const sanitizedTitle = await friendlyText(title);

        const supabase = await createClient();

        const { data, error } = await supabase.from('playlists').insert({
            title: sanitizedTitle,
            visibility: visibility,
            thumbnail: fileName,
            user_id: userId
        }).select();

        console.log(data);

        if (error) {
            return NextResponse.json({ errors: [error.message] }, { status: 500 });
        }

        return NextResponse.json({ message: 'Playlist created', data: data[0] }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ errors: ["An error occurred while creating the playlist", error, ...errors] }, { status: 500 });
    }
}

async function friendlyText(text: string): Promise<string> {
    // Get all words from all languages
    const allNaughtyWords = new Set(Object.values(naughtyWords).flatMap(langWords => langWords));
    
    return text.toLowerCase().split(' ').map(word => {
        // Check if the word exists in any language's list
        return allNaughtyWords.has(word) ? '*'.repeat(word.length) : word;
    }).join(' ');
}
