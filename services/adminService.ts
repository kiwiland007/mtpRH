
import { supabase } from '../lib/supabase';
import { UserRole, LeaveStatus, LeaveType } from '../types';

export const adminService = {
    async fetchUsers() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('full_name');
        if (error) throw error;
        return data || [];
    },

    async fetchAllRequests() {
        // Essayer d'abord avec la relation (join)
        let { data: reqs, error: reqError } = await supabase
            .from('leave_requests')
            .select('*, profiles(full_name, department)')
            .order('created_at', { ascending: false });

        // Si la relation n'existe pas, faire un fallback sans join
        if (reqError && (reqError.message?.includes('relationship') || reqError.message?.includes('schema cache'))) {
            const { data: reqsData, error: reqsError } = await supabase
                .from('leave_requests')
                .select('*')
                .order('created_at', { ascending: false });

            if (reqsError) throw reqsError;

            const { data: users, error: usersError } = await supabase.from('profiles').select('*');
            if (usersError) throw usersError;

            const usersMap = new Map((users || []).map(u => [u.id, u]));

            return (reqsData || []).map(req => ({
                ...req,
                profiles: usersMap.get(req.user_id) || { full_name: 'Inconnu', department: 'N/A' }
            }));
        } else if (reqError) {
            throw reqError;
        }

        return reqs || [];
    },

    async fetchLogs() {
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*, profiles(full_name)')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error && error.message?.includes('relationship')) {
            // Fallback for logs too
            const { data: simpleData, error: simpleError } = await supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);
            if (simpleError) throw simpleError;
            return simpleData || [];
        }

        if (error) throw error;
        return data || [];
    },

    async updateUser(userId: string, updateData: any) {
        const { error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', userId);
        if (error) throw error;
    },

    async createUser(userData: any) {
        const { error } = await supabase
            .from('profiles')
            .insert([userData]);
        if (error) throw error;
    },

    async updateRequestStatus(requestId: string, status: LeaveStatus, comment?: string) {
        const { error } = await supabase
            .from('leave_requests')
            .update({
                status: status,
                manager_comment: comment
            })
            .eq('id', requestId);
        if (error) throw error;
    },

    async updateRequest(requestId: string, updateData: any) {
        const { error } = await supabase
            .from('leave_requests')
            .update(updateData)
            .eq('id', requestId);
        if (error) throw error;
    },

    async createRequest(requestData: any) {
        const { error } = await supabase
            .from('leave_requests')
            .insert([requestData]);
        if (error) throw error;
    },

    async logAudit(action: string, details: any, userId?: string) {
        await supabase.from('audit_logs').insert([{
            action,
            details,
            performed_by: userId
        }]);
    }
};
