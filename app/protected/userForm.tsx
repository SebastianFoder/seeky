"use client"

import { useState, useEffect } from 'react';
import { accountService } from '@/services/accountService';
import { Account } from '@/types/account';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';
import { AvatarOptions, clientResizeJpg } from '@/lib/resizeJpg';
import { useAvatar } from '../context/AvatarContext';

interface UserFormProps {
    uid: string; // User ID
}

export default function UserForm({ uid }: UserFormProps) {
    const { avatarUrl, setAvatarUrl } = useAvatar();
    const [account, setAccount] = useState<Account | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Account>>({});
    const [avatar, setAvatar] = useState<File | null>(null);
    const [avatarResized, setAvatarResized] = useState<Blob | null>(null);
    const [avatarOptions, setAvatarOptions] = useState<AvatarOptions>(
        {
            placement: 'center',
            fit: 'cover',
            backgroundColor: '#000',
        }
    );
    const [message, setMessage] = useState<string | null>(null);
    
    const supabase = createClient();

    useEffect(() => {
        if(avatar && avatarOptions){
            const resizeAvatar = async () => {
                const resizedAvatar = await clientResizeJpg({
                    path: URL.createObjectURL(avatar),
                    width: 256,
                    height: 256,
                    placement: avatarOptions.placement,
                    fit: avatarOptions.fit,
                    backgroundColor: avatarOptions.backgroundColor,
                });
                setAvatarResized(resizedAvatar);
            }
            resizeAvatar();
        }
    }, [avatar, avatarOptions]);

    useEffect(() => {
        const fetchAccount = async () => {
            try {
                const fetchedAccount = await accountService.getAccountByUid(supabase, uid);
                setAccount(fetchedAccount);
                setFormData(fetchedAccount || {});
            } catch (err) {
                setError('Failed to fetch account details');
            } finally {
                setLoading(false);
            }
        };

        fetchAccount();
    }, [uid]);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleUserInfoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (account) {
            const success = await accountService.updateAccount(supabase, account.uid, formData);
            if (success) {
                setMessage('Account updated successfully');
            } else {
                setMessage('Failed to update account');
            }
        }
    };

    const handleUserAvatarSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (account && avatar) {
            const newAvatarUrl = await accountService.updateAccountAvatar(supabase, account.uid, avatar, avatarOptions);
            if (newAvatarUrl) {
                setMessage('Avatar updated successfully');
                console.log(newAvatarUrl);
                setAvatarUrl(newAvatarUrl);
            } else {
                setMessage('Failed to update avatar');
            }
        }
    };

    const handleAvatarOptionsChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setAvatarOptions((prev) => ({ ...prev, [name]: value }));
    };

    if (loading) return <p>Loading...</p>;
    if (error) return <p>{error}</p>;

    if(!account) return <p>Account not found</p>;

    return (
        <div className="user-form" onSubmit={handleUserInfoSubmit}>
            <h2>Edit User Information</h2>
            {message && <div className="message-box">{message}</div>}
            <div className="row">
                <div className="col">
                    <form onSubmit={handleUserInfoSubmit}>
                        <div className="form-group">
                            <label>
                            Display Name:
                            </label>
                            <input
                                type="text"
                                name="display_name"
                                value={formData.display_name || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>
                                Bio:
                            </label>
                            <textarea
                                name="bio"
                                value={formData.bio || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <button type="submit">Save Info</button>
                    </form>
                </div>
                <div className="col">
                    <form onSubmit={handleUserAvatarSubmit}>
                        <div className="form-group">
                            <label>
                                Avatar:
                            </label>
                            <div className="avatar-preview">
                                <input 
                                    type="file" 
                                    name="avatar" 
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setAvatar(file);
                                        }
                                    }} 
                                />
                                {avatar && avatarResized ? (
                                    <img className="avatar-preview-image" src={URL.createObjectURL(avatarResized)} alt="Avatar Preview" />
                                ) : (
                                    <Image className="avatar-preview-image avatar-preview-image-default" width={256} height={256} src={account?.avatar_url || ''} alt="Current Avatar" />
                                )}
                            </div>
                        </div>
                        {avatar && avatarResized && (
                            <>
                                <div className="form-group">
                                    <label>Placement:</label>
                                    <div className="radio-group">
                                    {['top', 'center', 'bottom'].map((option) => (
                                        <label key={option} className={"pill-label" + (avatarOptions.placement === option ? ' selected' : '')}>
                                            <input 
                                                type="radio" 
                                                name="placement" 
                                                value={option} 
                                                checked={avatarOptions.placement === option} 
                                                onChange={handleAvatarOptionsChange} 
                                            />
                                            {option.charAt(0).toUpperCase() + option.slice(1)}
                                        </label>
                                    ))}
                                </div>
                                </div>
                                <div className="form-group">
                                    <label>Fit:</label>
                                    <div className="radio-group">
                                        {['cover', 'contain'].map((option) => (
                                            <label key={option} className={"pill-label" + (avatarOptions.fit === option ? ' selected' : '')}>
                                                <input 
                                                    type="radio" 
                                                    name="fit" 
                                                    value={option} 
                                                    checked={avatarOptions.fit === option} 
                                                    onChange={handleAvatarOptionsChange} 
                                                />
                                                {option.charAt(0).toUpperCase() + option.slice(1)}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                {avatarOptions.fit === 'contain' && (
                                    <div className="form-group">
                                        <label>
                                        Background Color:
                                    </label>
                                    <input 
                                            type="color" 
                                            name="backgroundColor" 
                                            value={avatarOptions.backgroundColor} 
                                            onChange={(e) => handleAvatarOptionsChange(e)} 
                                        />
                                    </div>
                                )}
                                <button type="submit">Save Avatar</button>
                            </>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}

