"use client";

import React, { createContext, useContext, useState } from 'react';

const AvatarContext = createContext<{ avatarUrl: string | null; setAvatarUrl: (url: string | null) => void } | undefined>(undefined);

export const AvatarProvider = ({ children }: { children: React.ReactNode }) => {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    return <AvatarContext.Provider value={{ avatarUrl, setAvatarUrl }}>{children}</AvatarContext.Provider>;
};

export const useAvatar = () => {
    const context = useContext(AvatarContext);
    if (!context) {
        throw new Error('useAvatar must be used within an AvatarProvider');
    }
    return context;
};

