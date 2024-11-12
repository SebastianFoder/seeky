"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { videoService } from "@/services/videoService";
import { redirect } from "next/navigation";

interface VideoUploadProps {
    userId: string;
}

export default function VideoUpload({ userId }: VideoUploadProps) {
    const supabase = createClient();
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [title, setTitle] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [tags, setTags] = useState<string>('');
    const [visibility, setVisibility] = useState<'private' | 'unlisted' | 'public'>('public');
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            const validVideoTypes = ["video/mp4"];
            if (!validVideoTypes.includes(file.type)) {
                setError("Only MP4 videos are allowed.");
                setVideoFile(null);
                return;
            }
            setError('');
            setVideoFile(file);
        }
    };

    const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            const validImageTypes = ["image/jpeg", "image/jpg"];
            if (!validImageTypes.includes(file.type)) {
                setError("Only JPG/JPEG images are allowed.");
                setThumbnailFile(null);
                return;
            }
            setError('');
            setThumbnailFile(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!videoFile || !thumbnailFile) {
            setError("Please select both video and thumbnail files.");
            return;
        }

        if (title.length < 3) {
            setError("Title must be at least 3 characters long.");
            return;
        }

        try {
            const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);

            const video = await videoService.uploadVideo(supabase, videoFile, thumbnailFile, {
                title,
                description,
                tags: tagsArray,
                userId,
                visibility
            });

            console.log('Video uploaded:', video);
            redirect(`/videos/${video.id}`);
        } catch (error: any) {
            console.error('Upload failed:', error);
            setError('Failed to upload video. Please try again.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="video-upload-form">
            {error && <p className="error-message">{error}</p>}
            {successMessage && <p className="success-message">{successMessage}</p>}
            <div>
                <label htmlFor="video">Video File (MP4):</label>
                <input 
                    type="file" 
                    id="video" 
                    accept=".mp4" 
                    onChange={handleVideoChange} 
                    required 
                />
            </div>
            <div>
                <label htmlFor="thumbnail">Thumbnail File (JPG/JPEG):</label>
                <input 
                    type="file" 
                    id="thumbnail" 
                    accept=".jpg, .jpeg" 
                    onChange={handleThumbnailChange} 
                    required 
                />
            </div>
            <div>
                <label htmlFor="title">Title:</label>
                <input 
                    type="text" 
                    id="title" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    required 
                />
            </div>
            <div>
                <label htmlFor="description">Description:</label>
                <textarea 
                    id="description" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                />
            </div>
            <div>
                <label htmlFor="tags">Tags (comma separated):</label>
                <input 
                    type="text" 
                    id="tags" 
                    value={tags} 
                    onChange={(e) => setTags(e.target.value)} 
                />
            </div>
            <div>
                <label htmlFor="visibility">Visibility:</label>
                <select 
                    id="visibility" 
                    value={visibility} 
                    onChange={(e) => setVisibility(e.target.value as 'private' | 'unlisted' | 'public')}
                >
                    <option value="public">Public</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="private">Private</option>
                </select>
            </div>
            <button type="submit" className="btn btn-primary">Upload Video</button>
        </form>
    );
};