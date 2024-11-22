import { SupabaseClient } from '@supabase/supabase-js';
import { Account } from '@/types/account';

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
        updates: Partial<Pick<Account, 'display_name' | 'avatar_url' | 'bio' | 'email'>>
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