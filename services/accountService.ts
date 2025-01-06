import { SupabaseClient } from '@supabase/supabase-js';
import { Account } from '@/types/account';
import axios from 'axios';
import { AvatarOptions } from '@/lib/resizeJpg';

export const accountService = {
    /**
     * Fetch account details by UID
     * @param supabase - Supabase client instance
     * @param uid - UID of the account
     * @returns The Account object or null if not found
     */
    async getAccountByUid(supabase: SupabaseClient, uid: string): Promise<Account | null> {
        try {
            const { data, error } = await supabase
                .from('accounts')
                .select('*')
                .eq('uid', uid)
                .single();

            if (error) {
                console.error('Error fetching account:', error);
                return null;
            }

            return data as Account;
        } catch (error) {
            console.error('Error in getAccountByUid:', error);
            return null;
        }
    },

    /**
     * Update account details
     * @param supabase - Supabase client instance
     * @param uid - UID of the account to update
     * @param updates - Fields to update
     * @returns True if update was successful, false otherwise
     */
    async updateAccount(
        supabase: SupabaseClient,
        uid: string,
        updates: Partial<Pick<Account, 'display_name' | 'bio' | 'email'>>
    ): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('accounts')
                .update(updates)
                .eq('uid', uid);

            if (error) {
                console.error('Error updating account:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error in updateAccount:', error);
            return false;
        }
    },

    /**
     * Update the account avatar
     * @param supabase - Supabase client instance
     * @param uid - UID of the account to update
     * @param avatarFile - The new avatar file to upload
     * @returns The new avatar URL or null if the avatar update was unsuccessful
     */
    async updateAccountAvatar(supabase: SupabaseClient, uid: string, avatarFile: File, avatarOptions: AvatarOptions, avatarUrl?: string): Promise<string | null> {
        try {            
            const options = JSON.stringify(avatarOptions);
            const res = await axios.post('/api/avatar', { file: avatarFile, options: options }, { headers: { 'Content-Type': 'multipart/form-data' } });

            if (res.status !== 200) {
                throw new Error('Error uploading avatar');
            }

            const newAvatarUrl = res.data.url;

            let curentAvatarName;

            if (avatarUrl) {
                curentAvatarName = avatarUrl.split('/').pop();
            }
            else{
                const { data: user, error: userError } = await supabase
                    .from('accounts')
                    .select('*')
                    .eq('uid', uid)
                    .single();

                if (userError) {
                    throw new Error('Error fetching user');
                }
        
                curentAvatarName = user?.avatar_url.split('/').pop();
            }            

            const { error: updateError } = await supabase
                .from('accounts')
                .update({ avatar_url: newAvatarUrl })
                .eq('uid', uid);

            if (updateError) {
                throw new Error('Error updating account avatar');
            }
            // Delete old avatar if it's not the default avatar
            if (curentAvatarName && curentAvatarName !== 'avatar-default.jpg') {
                const res = await axios.delete(`/api/avatar/${curentAvatarName}`);

                if (res.status !== 200) {
                    throw new Error('Error deleting avatar');
                }

            }

            return newAvatarUrl;
        } catch (error) {
            console.error('Error in updateAccountAvatar:', error);
            return null;
        }
    },

    /**
     * Search accounts by display name
     * @param supabase - Supabase client instance
     * @param searchTerm - Search term to filter accounts
     * @returns Array of matching accounts
     */
    async searchAccounts(supabase: SupabaseClient, searchTerm: string): Promise<Account[]> {
        try {
            const { data, error } = await supabase
                .from('accounts')
                .select('*')
                .ilike('display_name', `%${searchTerm}%`)
                .order('display_name', { ascending: true })
                .limit(10);

            if (error) {
                console.error('Error searching accounts:', error);
                return [];
            }

            return data as Account[];
        } catch (error) {
            console.error('Error in searchAccounts:', error);
            return [];
        }
    },

    /**
     * Additional account management methods can be added here
     */
}; 