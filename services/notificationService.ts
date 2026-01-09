
import { supabase } from '../lib/supabase';

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
    is_read: boolean;
    created_at: string;
}

export const notificationService = {
    async fetchNotifications(userId: string) {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        return data as Notification[];
    },

    async markAsRead(notificationId: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) throw error;
    },

    async markAllAsRead(userId: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw error;
    },

    async createNotification(userId: string, title: string, message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') {
        const { data, error } = await supabase
            .from('notifications')
            .insert([{
                user_id: userId,
                title,
                message,
                type
            }])
            .select()
            .single();

        if (error) throw error;
        return data as Notification;
    },

    async sendToRole(role: string, title: string, message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') {
        // Récupérer tous les utilisateurs avec ce rôle
        const { data: users, error: userError } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', role);

        if (userError) throw userError;

        if (users && users.length > 0) {
            const notifications = users.map(u => ({
                user_id: u.id,
                title,
                message,
                type
            }));

            const { error } = await supabase
                .from('notifications')
                .insert(notifications);

            if (error) throw error;
        }
    }
};
