"use client";

import { accountService } from '@/services/accountService';
import { Account } from '@/types/account';
import { createClient } from '@/utils/supabase/client';
import React, { createContext, useContext, useEffect, useState } from 'react';

const AccountContext = createContext<{ account: Account | null; refetchAccount: () => Promise<void> } | undefined>(undefined);

export const AccountProvider = ({ children }: { children: React.ReactNode }) => {
    const [account, setAccount] = useState<Account | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    const refetchAccount = async () => {
        const supabase = await createClient();
        const { data: {session} } = await supabase.auth.getSession();
        if(session?.user){
            const account = await accountService.getAccountByUid(supabase, session.user.id);
            setAccount(account);
        }
    }


    useEffect(() => {
        console.log("isInitialized", isInitialized);
        const fetchAccount = async () => {
            if(!isInitialized){
                const supabase = await createClient();
                const { data: {session} } = await supabase.auth.getSession();
                if(session?.user){
                    const account = await accountService.getAccountByUid(supabase, session.user.id);
                    setAccount(account);
                    setIsInitialized(true);
                }
            }
        };
        fetchAccount();

        return () => {
            setIsInitialized(false);
        };
    }, []);

    return <AccountContext.Provider value={{ account, refetchAccount }}>{children}</AccountContext.Provider>;
};

export const useAccount = () => {
    const context = useContext(AccountContext);
    if (!context) {
        throw new Error('useAccount must be used within an AccountProvider');
    }
    return context;
};
