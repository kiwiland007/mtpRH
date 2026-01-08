
import { supabase } from '../lib/supabase';
import { UserRole, LeaveStatus, LeaveType, CarryoverStatus } from '../types';

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
    },

    // --- CARRYOVER OPERATIONS ---

    async fetchCarryovers(year: number, status?: CarryoverStatus, department?: string) {
        let query = supabase.from('annual_carryovers').select(`
            *,
            profiles!annual_carryovers_user_id_fkey (
                id,
                full_name,
                email,
                department,
                hire_date
            )
        `).eq('year', year);

        if (status) query = query.eq('status', status);

        const { data, error } = await query.order('user_id');
        if (error) throw error;

        let results = data || [];
        if (department) {
            results = results.filter((item: any) => item.profiles?.department === department);
        }

        return results.map((item: any) => ({
            userId: item.user_id,
            fullName: item.profiles?.full_name || 'N/A',
            department: item.profiles?.department || 'N/A',
            hireDate: item.profiles?.hire_date || '',
            year: item.year,
            accruedDays: item.accrued_days,
            usedDays: item.used_days,
            remainingDays: item.remaining_days,
            previousCarryover: item.previous_carryover,
            nextCarryover: item.next_carryover,
            forfeitedDays: item.forfeited_days,
            usedDaysAdjustment: item.used_days_adjustment || 0,
            totalUsedDays: (item.used_days || 0) + (item.used_days_adjustment || 0),
            status: item.status,
            validatedAt: item.validated_at,
            validatedBy: item.validated_by
        }));
    },

    async updateCarryover(userId: string, year: number, data: any) {
        const { error } = await supabase
            .from('annual_carryovers')
            .update(data)
            .eq('user_id', userId)
            .eq('year', year);
        if (error) throw error;
    },

    async upsertCarryover(carryoverData: any) {
        const { error } = await supabase
            .from('annual_carryovers')
            .upsert(carryoverData, { onConflict: 'user_id,year' });
        if (error) throw error;
    },

    async logCarryoverAudit(carryoverId: string, action: string, performedBy: string, reason: string, details: any) {
        const { error } = await supabase
            .from('carryover_audit')
            .insert({
                carryover_id: carryoverId,
                action,
                performed_by: performedBy,
                reason,
                new_values: details
            });
        if (error) throw error;
    }
};
