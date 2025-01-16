"use client";

import { useState } from "react";
import { processImage } from "./functions/imageProcessor";
import { Upload } from "lucide-react";
import axios from "axios";
import { useAccount } from "@/app/context/AccountContext";
import { useRouter } from "next/navigation";


export default function PlaylistCreateComponent() {
    const thumbnailWidth = 854;
    const thumbnailHeight = 480;
    const thumbnailAllowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/bmp', 'image/tiff', 'image/tif', 'image/heic', 'image/heif'];

    const { account } = useAccount();
    const router = useRouter();
    const [title, setTitle] = useState<string>('');
    const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
    const [thumbnail, setThumbnail] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
    const [error, setError] = useState<string>('');

    const handleCustomThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        await processImage(
            file,
            {
                width: thumbnailWidth,
                height: thumbnailHeight,
                allowedTypes: thumbnailAllowedTypes
            },
            {
                onComplete: ({ file: scaledFile, dataUrl }) => {
                    setThumbnail(scaledFile);
                    setThumbnailPreview(dataUrl);
                    setError('');
                },
                onError: (errorMessage) => {
                    setError(errorMessage);
                    setThumbnailPreview('');
                }
            }
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', title);
        formData.append('visibility', visibility);
        if(account){
            formData.append('userId', account.uid);
        }
        if (thumbnail) {
            formData.append('thumbnail', thumbnail);
        }
        const response = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/playlists`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        if(response.status === 200){
            router.push(`/playlists/${response.data.id}`);
        }
    };


    return (
        <form className="video-upload-form" onSubmit={handleSubmit}>
            <h1>Create Playlist</h1>
            {error && <p className="error-message">{error}</p>}
            <div className="form-group">
                <label htmlFor="title">Title</label>
                <input type="text" id="title" placeholder="Playlist Title" minLength={3} maxLength={63} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="form-group">
                <label htmlFor="visibility">Visibility</label>
                <select id="visibility" value={visibility} required onChange={(e) => setVisibility(e.target.value as 'public' | 'unlisted' | 'private')}>
                    <option value="public">Public</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="private">Private</option>
                </select>
            </div>
            <div className="form-group">
                <label htmlFor="thumbnail">Custom Thumbnail</label>

            {thumbnailPreview ? (
                        <div className={`thumbnail-option-wrapper`} onClick={() => document.getElementById('thumbnail')?.click()}>
                            <img style={{cursor: 'pointer'}} src={thumbnailPreview} alt="Custom Thumbnail" className="custom-thumbnail-preview" />
                            <input 
                                type="file"
                                id="thumbnail"
                                accept={thumbnailAllowedTypes.join(', ')}
                                onChange={handleCustomThumbnailChange}
                                style={{ display: 'none' }}
                            />
                        </div>
                    ) : (
                        <div className="custom-upload-button custom-upload-button-xs thumbnail-option-wrapper">
                            <div className="custom-upload-button-text">
                                <Upload className="custom-upload-icon" />
                                Upload
                            </div>
                            <input 
                                className="custom-upload-input"
                                type="file" 
                                id="thumbnail" 
                                accept={thumbnailAllowedTypes.join(', ')} 
                                onChange={handleCustomThumbnailChange} 
                            />
                        </div>
                    )}
            </div>
            <button type="submit" className="btn btn-primary">Create</button>
        </form>
    );
}