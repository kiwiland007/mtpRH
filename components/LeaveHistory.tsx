
import React, { useState, useEffect } from 'react';
import { User, UserRole, LeaveRequest, LeaveType, LeaveStatus } from '../types';
import { calculateBusinessDays } from '../utils/calculations';

import {
    EditRequestModal,
} from './admin';

interface LeaveHistoryProps {
    currentUser: User;
    supabaseClient: any;
}

interface HistoryFilters {
    period: 'month' | 'quarter' | 'year' | 'all' | 'custom';
    startDate?: string;
    endDate?: string;
    leaveType?: LeaveType | 'all';
    status?: LeaveStatus | 'all';
    searchTerm: string;
    employeeId?: string;
    department?: string;
}

interface EmployeeBalance {
    userId: string;
    fullName: string;
    totalAccrued: number;
    totalUsed: number;
    remaining: number;
    pendingDays: number;
}

const LeaveHistory: React.FC<LeaveHistoryProps> = ({ currentUser, supabaseClient }) => {
    const [history, setHistory] = useState<LeaveRequest[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [balances, setBalances] = useState<EmployeeBalance[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<HistoryFilters>({
        period: 'year',
        leaveType: 'all',
        status: 'all',
        searchTerm: '',
        employeeId: currentUser.role === UserRole.EMPLOYEE ? currentUser.id : undefined,
        department: 'all'
    });
    const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [editModalData, setEditModalData] = useState<any | null>(null);

    useEffect(() => {
        loadData();
    }, [filters]);

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadHistory(),
                loadEmployees(),
                loadBalances()
            ]);
        } catch (error) {
            console.error('Erreur chargement données:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadHistory = async () => {
        try {
            let query = supabaseClient
                .from('leave_requests')
                .select('*')
                .order('created_at', { ascending: false });

            // Filtre par employé (si non-admin)
            if (currentUser.role === UserRole.EMPLOYEE) {
                query = query.eq('user_id', currentUser.id);
            } else if (filters.employeeId) {
                query = query.eq('user_id', filters.employeeId);
            }

            // Filtre par période
            if (filters.period !== 'all') {
                const { startDate, endDate } = calculatePeriodDates(filters.period, filters.startDate, filters.endDate);
                if (startDate) query = query.gte('start_date', startDate);
                if (endDate) query = query.lte('end_date', endDate);
            }

            // Filtre par type
            if (filters.leaveType && filters.leaveType !== 'all') {
                query = query.eq('type', filters.leaveType);
            }

            // Filtre par statut
            if (filters.status && filters.status !== 'all') {
                query = query.eq('status', filters.status);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Mapping manuel des informations employé (évite les erreurs de jointure schema cache)
            let mappedData: LeaveRequest[] = (data || []).map((item: any) => {
                // Trouver l'employé dans la liste chargée ou utiliser l'utilisateur actuel
                const employee = employees.find(e => e.id === item.user_id) ||
                    (item.user_id === currentUser.id ? currentUser : null);

                return {
                    id: item.id,
                    userId: item.user_id,
                    type: item.type as LeaveType,
                    startDate: item.start_date,
                    endDate: item.end_date,
                    status: item.status as LeaveStatus,
                    duration: Number(item.duration) || 0,
                    comment: item.comment || '',
                    managerComment: item.manager_comment || '',
                    createdAt: item.created_at,
                    employeeName: employee ? (employee.full_name || employee.fullName) : 'N/A',
                    employeeDepartment: employee ? (employee.department) : 'N/A'
                };
            });

            // Filtre par recherche
            if (filters.searchTerm) {
                const term = filters.searchTerm.toLowerCase();
                mappedData = mappedData.filter(leave =>
                    leave.employeeName?.toLowerCase().includes(term) ||
                    leave.employeeDepartment?.toLowerCase().includes(term) ||
                    leave.comment?.toLowerCase().includes(term)
                );
            }

            // Filtre par département
            if (filters.department && filters.department !== 'all') {
                mappedData = mappedData.filter(leave =>
                    leave.employeeDepartment === filters.department
                );
            }

            setHistory(mappedData);
        } catch (error: any) {
            showNotification('error', 'Erreur lors du chargement de l\'historique: ' + error.message);
        }
    };

    const loadEmployees = async () => {
        if (currentUser.role === UserRole.EMPLOYEE) return;

        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('id, full_name, department, hire_date')
                .eq('is_active', true)
                .order('full_name');

            if (error) throw error;
            setEmployees(data || []);
        } catch (error: any) {
            console.error('Erreur chargement employés:', error);
        }
    };

    const handleEditRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editModalData) return;

        try {
            const businessDays = calculateBusinessDays(editModalData.start_date, editModalData.end_date);
            const { error } = await supabaseClient
                .from('leave_requests')
                .update({
                    type: editModalData.type,
                    start_date: editModalData.start_date,
                    end_date: editModalData.end_date,
                    duration: businessDays
                })
                .eq('id', editModalData.id);

            if (error) throw error;
            showNotification('success', 'Demande ajustée avec succès');
            setEditModalData(null);
            loadData();
        } catch (error: any) {
            showNotification('error', 'Erreur lors de l\'ajustement: ' + error.message);
        }
    };

    const handleDeleteRequest = async (requestId: string) => {
        if (!window.confirm('Action critique : Voulez-vous vraiment supprimer définitivement cet enregistrement ?')) return;

        try {
            const { error } = await supabaseClient
                .from('leave_requests')
                .delete()
                .eq('id', requestId);

            if (error) throw error;
            showNotification('success', 'Enregistrement supprimé');
            loadData();
        } catch (error: any) {
            showNotification('error', 'Erreur de suppression: ' + error.message);
        }
    };

    const handleCancelRequest = async (requestId: string) => {
        if (!window.confirm('Voulez-vous vraiment annuler cette demande ?')) return;

        try {
            const { error } = await supabaseClient
                .from('leave_requests')
                .update({ status: LeaveStatus.CANCELLED })
                .eq('id', requestId);

            if (error) throw error;
            showNotification('success', 'Demande annulée avec succès');
            loadData();
        } catch (error: any) {
            showNotification('error', 'Erreur lors de l\'annulation: ' + error.message);
        }
    };

    const loadBalances = async () => {
        try {
            const currentYear = new Date().getFullYear();

            let query = supabaseClient
                .from('v_employee_balances')
                .select('*')
                .eq('year', currentYear);

            if (currentUser.role === UserRole.EMPLOYEE) {
                query = query.eq('user_id', currentUser.id);
            } else if (filters.employeeId) {
                query = query.eq('user_id', filters.employeeId);
            }

            const { data, error } = await query;

            if (error) throw error;

            const balancesData: EmployeeBalance[] = (data || []).map((b: any) => ({
                userId: b.user_id,
                fullName: b.full_name,
                totalAccrued: Number(b.accrued_days) + Number(b.previous_carryover),
                totalUsed: Number(b.used_days),
                remaining: Number(b.remaining_days),
                pendingDays: 0 // On pourrait calculer ça via une autre vue si nécessaire
            }));

            setBalances(balancesData);
        } catch (error: any) {
            console.error('Erreur chargement soldes:', error);
        }
    };

    const calculatePeriodDates = (period: string, customStart?: string, customEnd?: string) => {
        const now = new Date();
        let startDate = '';
        let endDate = '';

        switch (period) {
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
                break;
            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
                endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0).toISOString().split('T')[0];
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
                endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
                break;
            case 'custom':
                startDate = customStart || '';
                endDate = customEnd || '';
                break;
        }

        return { startDate, endDate };
    };

    const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const exportToExcel = () => {
        const headers = [
            'Employé',
            'Département',
            'Type de congé',
            'Date début',
            'Date fin',
            'Durée (jours)',
            'Statut',
            'Commentaire',
            'Date de demande'
        ];

        const rows = history.map(leave => [
            leave.employeeName,
            leave.employeeDepartment,
            getLeaveTypeLabel(leave.type),
            new Date(leave.startDate).toLocaleDateString('fr-FR'),
            new Date(leave.endDate).toLocaleDateString('fr-FR'),
            leave.duration,
            getStatusLabel(leave.status),
            leave.comment || '',
            new Date(leave.createdAt).toLocaleDateString('fr-FR')
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `historique_conges_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        showNotification('success', 'Export Excel réussi !');
    };

    const exportToPDF = () => {
        // Créer un contenu HTML pour l'impression
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showNotification('error', 'Impossible d\'ouvrir la fenêtre d\'impression');
            return;
        }

        const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Historique des Congés</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1e3a8a; border-bottom: 3px solid #ef4444; padding-bottom: 10px; }
          .header { margin-bottom: 30px; }
          .info { background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #1e3a8a; color: white; padding: 12px; text-align: left; font-size: 12px; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
          tr:nth-child(even) { background: #f8fafc; }
          .status-approved { color: #059669; font-weight: bold; }
          .status-pending { color: #d97706; font-weight: bold; }
          .status-rejected { color: #dc2626; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Historique des Congés</h1>
          <div class="info">
            <p><strong>Date d'export :</strong> ${new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}</p>
            <p><strong>Période :</strong> ${getPeriodLabel(filters.period)}</p>
            <p><strong>Nombre de demandes :</strong> ${history.length}</p>
            ${currentUser.role !== UserRole.EMPLOYEE ? `<p><strong>Exporté par :</strong> ${currentUser.fullName}</p>` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Employé</th>
              <th>Département</th>
              <th>Type</th>
              <th>Début</th>
              <th>Fin</th>
              <th>Durée</th>
              <th>Statut</th>
              <th>Commentaire</th>
            </tr>
          </thead>
          <tbody>
            ${history.map(leave => `
              <tr>
                <td>${leave.employeeName}</td>
                <td>${leave.employeeDepartment}</td>
                <td>${getLeaveTypeLabel(leave.type)}</td>
                <td>${new Date(leave.startDate).toLocaleDateString('fr-FR')}</td>
                <td>${new Date(leave.endDate).toLocaleDateString('fr-FR')}</td>
                <td>${leave.duration}j</td>
                <td class="status-${leave.status.toLowerCase()}">${getStatusLabel(leave.status)}</td>
                <td>${leave.comment || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Document généré automatiquement par mtpRH - Conforme au Code du Travail Marocain</p>
          <p>© ${new Date().getFullYear()} MOUMEN RH & Prévoyance</p>
        </div>
      </body>
      </html>
    `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();

        setTimeout(() => {
            printWindow.print();
            showNotification('success', 'Export PDF lancé !');
        }, 250);
    };

    const getLeaveTypeLabel = (type: LeaveType): string => {
        const labels = {
            ANNUAL: 'Congé Annuel',
            SICK: 'Maladie',
            MATERNITY: 'Maternité',
            EXCEPTIONAL: 'Exceptionnel',
            RTT: 'RTT'
        };
        return labels[type] || type;
    };

    const getStatusLabel = (status: LeaveStatus): string => {
        const labels = {
            PENDING: 'En attente',
            APPROVED: 'Approuvé',
            REJECTED: 'Rejeté',
            CANCELLED: 'Annulé'
        };
        return labels[status] || status;
    };

    const getStatusBadge = (status: LeaveStatus) => {
        const styles = {
            PENDING: 'bg-amber-100 text-amber-700',
            APPROVED: 'bg-emerald-100 text-emerald-700',
            REJECTED: 'bg-rose-100 text-rose-700',
            CANCELLED: 'bg-slate-100 text-slate-700'
        };

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${styles[status]}`}>
                {getStatusLabel(status)}
            </span>
        );
    };

    const getPeriodLabel = (period: string): string => {
        const labels = {
            month: 'Mois en cours',
            quarter: 'Trimestre en cours',
            year: 'Année en cours',
            all: 'Toutes les périodes',
            custom: 'Période personnalisée'
        };
        return labels[period as keyof typeof labels] || period;
    };

    const getBalance = (userId: string) => {
        return balances.find(b => b.userId === userId);
    };

    const getLeaveTypeIcon = (type: LeaveType) => {
        switch (type) {
            case 'ANNUAL': return '🏖️';
            case 'SICK': return '🤒';
            case 'MATERNITY': return '👶';
            case 'EXCEPTIONAL': return '🌟';
            case 'RTT': return '⏰';
            default: return '📄';
        }
    };

    // Préparation des données pour le graphique
    const typeStats = history.reduce((acc: any[], curr) => {
        const existing = acc.find(a => a.name === curr.type);
        if (existing) {
            existing.value += curr.duration;
        } else {
            acc.push({ name: curr.type, label: getLeaveTypeLabel(curr.type), value: curr.duration });
        }
        return acc;
    }, []);

    const departments = Array.from(new Set(employees.map(e => e.department))).filter(Boolean);

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans selection:bg-indigo-100 selection:text-indigo-900">
            {/* Header & Main Card */}
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
                    {/* Top Aesthetic Header */}
                    <div className="bg-slate-950 p-8 md:p-12 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/10 to-transparent"></div>
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl"></div>

                        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full backdrop-blur-md border border-white/10 mb-4">
                                    <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Data Registry</span>
                                </div>
                                <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none mb-2">Historique des Congés</h1>
                                <p className="text-slate-400 font-medium max-w-md text-sm md:text-base">
                                    Vue centralisée et analytique de toutes les absences et demandes de l'organisation.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={loadData} className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all group" title="Actualiser">
                                    <svg className="w-5 h-5 text-white group-hover:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                </button>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dernière mise à jour</span>
                                    <span className="text-sm font-bold">{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filtres */}
                    {/* Filtres Avancés */}
                    <div className="p-8 bg-white">
                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Barre latérale de recherche et période */}
                            <div className="lg:w-1/3 space-y-6">
                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder="Rechercher un profil, un motif..."
                                        value={filters.searchTerm}
                                        onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-semibold focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-sm group-hover:border-slate-200"
                                    />
                                    <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Période temporelle</label>
                                        <select
                                            value={filters.period}
                                            onChange={(e) => setFilters({ ...filters, period: e.target.value as any })}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-3 text-xs font-bold focus:border-indigo-500 outline-none transition-all cursor-pointer"
                                        >
                                            <option value="month">Mois Actuel</option>
                                            <option value="quarter">Trimestre</option>
                                            <option value="year">Année en Cours</option>
                                            <option value="all">Historique Global</option>
                                            <option value="custom">Plage de Dates</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type de Congé</label>
                                        <select
                                            value={filters.leaveType || 'all'}
                                            onChange={(e) => setFilters({ ...filters, leaveType: e.target.value as any })}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-3 text-xs font-bold focus:border-indigo-500 outline-none transition-all cursor-pointer"
                                        >
                                            <option value="all">Tous types</option>
                                            <option value="ANNUAL">🏝️ Annuels</option>
                                            <option value="SICK">🤒 Maladie</option>
                                            <option value="MATERNITY">👶 Maternité</option>
                                            <option value="EXCEPTIONAL">🌟 Express</option>
                                            <option value="RTT">⏰ RTT</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Filtres secondaires */}
                            <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-3 gap-6">
                                {currentUser.role !== UserRole.EMPLOYEE && (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Département</label>
                                            <select
                                                value={filters.department || 'all'}
                                                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-4 px-4 text-xs font-bold focus:border-indigo-500 outline-none transition-all shadow-sm"
                                            >
                                                <option value="all">Tous Départements</option>
                                                {departments.map((dept: any) => <option key={dept} value={dept}>{dept}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Collaborateur</label>
                                            <select
                                                value={filters.employeeId || ''}
                                                onChange={(e) => setFilters({ ...filters, employeeId: e.target.value || undefined })}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-4 px-4 text-xs font-bold focus:border-indigo-500 outline-none transition-all shadow-sm"
                                            >
                                                <option value="">Tous Talents</option>
                                                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}
                                <div className="space-y-1.5 font-sans">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">État Admission</label>
                                    <select
                                        value={filters.status || 'all'}
                                        onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-4 px-4 text-xs font-bold focus:border-indigo-500 outline-none transition-all shadow-sm"
                                    >
                                        <option value="all">Tous Statuts</option>
                                        <option value="PENDING">🕒 En Attente</option>
                                        <option value="APPROVED">✅ Approuvé</option>
                                        <option value="REJECTED">❌ Refusé</option>
                                        <option value="CANCELLED">🚫 Annulé</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Dates Personnalisées */}
                        {filters.period === 'custom' && (
                            <div className="flex gap-4 mt-6 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 animate-in fade-in zoom-in duration-300">
                                <div className="flex-1 space-y-1">
                                    <span className="text-[10px] font-black text-indigo-400 uppercase ml-1">Du</span>
                                    <input type="date" value={filters.startDate || ''} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="w-full bg-white border border-indigo-100 rounded-xl py-2 px-3 text-xs font-bold outline-none focus:ring-2 ring-indigo-500/20 shadow-sm" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <span className="text-[10px] font-black text-indigo-400 uppercase ml-1">Au</span>
                                    <input type="date" value={filters.endDate || ''} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="w-full bg-white border border-indigo-100 rounded-xl py-2 px-3 text-xs font-bold outline-none focus:ring-2 ring-indigo-500/20 shadow-sm" />
                                </div>
                            </div>
                        )}

                        {/* Quick Action bar */}
                        <div className="mt-8 flex items-center justify-between border-t border-slate-50 pt-6">
                            <div className="flex gap-2">
                                <button onClick={exportToExcel} className="h-10 px-5 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 border border-emerald-100 shadow-sm">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    Format Excel
                                </button>
                                <button onClick={exportToPDF} className="h-10 px-5 bg-rose-50 text-rose-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all flex items-center gap-2 border border-rose-100 shadow-sm">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                    Format PDF
                                </button>
                            </div>

                            <div className="flex items-center gap-4 text-slate-400 text-xs font-bold">
                                <span>{history.length} résultats trouvés</span>
                                <div className="h-4 w-px bg-slate-200"></div>
                                <span className="text-indigo-600">Période : {getPeriodLabel(filters.period)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Analytical Metrics */}
                    <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {[
                                { label: 'Volume Total', value: history.length, sub: 'Demandes traitées', color: 'indigo', icon: '📊' },
                                { label: 'Approbations', value: history.filter(h => h.status === 'APPROVED').length, sub: 'Taux : ' + Math.round((history.filter(h => h.status === 'APPROVED').length / (history.filter(h => h.status !== 'PENDING').length || 1)) * 100) + '%', color: 'emerald', icon: '✅' },
                                { label: 'En Instruction', value: history.filter(h => h.status === 'PENDING').length, sub: 'Action requise', color: 'amber', icon: '🕒' },
                                { label: 'Impact RH', value: history.filter(h => h.status === 'APPROVED').reduce((sum, h) => sum + h.duration, 0), sub: 'Jours cumulés', color: 'rose', icon: '📈' }
                            ].map((card, i) => (
                                <div key={i} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-500 grayscale group-hover:grayscale-0`}>
                                        <span className="text-4xl">{card.icon}</span>
                                    </div>
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                                        <p className={`text-3xl font-black text-slate-900 mb-1`}>{card.value}</p>
                                        <p className="text-[10px] font-bold text-slate-500 bg-slate-50 inline-block px-2 py-0.5 rounded-full">{card.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden min-h-[400px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-24">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                            </div>
                            <p className="mt-6 text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Synchronisation...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-24 text-center">
                            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6">
                                <svg className="w-10 h-10 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight">Aucune donnée correspondante</h3>
                            <p className="text-sm text-slate-400 font-medium max-w-xs mt-2">Affinez vos filtres ou changez la période pour afficher les enregistrements.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                                        {currentUser.role !== UserRole.EMPLOYEE && <th className="px-8 py-5">Collaborateur</th>}
                                        <th className="px-8 py-5">Catégorie</th>
                                        <th className="px-8 py-5">Calendrier</th>
                                        <th className="px-8 py-5 text-center">Durée</th>
                                        <th className="px-8 py-5">Statut</th>
                                        <th className="px-8 py-5 text-right whitespace-nowrap">Actions RH</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {history.map((leave) => {
                                        const balance = getBalance(leave.userId);
                                        return (
                                            <tr key={leave.id} className="group hover:bg-slate-50/50 transition-colors">
                                                {currentUser.role !== UserRole.EMPLOYEE && (
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-black text-indigo-600">
                                                                {leave.employeeName.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-slate-900 tracking-tight leading-none mb-1">{leave.employeeName}</p>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{leave.employeeDepartment}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                )}
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl">{getLeaveTypeIcon(leave.type)}</span>
                                                        <span className="text-xs font-bold text-slate-600">{getLeaveTypeLabel(leave.type).split(' ')[1] || getLeaveTypeLabel(leave.type)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 rounded-lg px-2 py-1.5 w-fit border border-slate-100">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                        <span>{new Date(leave.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })} — {new Date(leave.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <span className="inline-flex h-8 w-12 items-center justify-center bg-indigo-950 text-white rounded-lg text-xs font-black ring-4 ring-indigo-50">
                                                        {leave.duration}j
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    {getStatusBadge(leave.status)}
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => { setSelectedLeave(leave); setShowDetailsModal(true); }} className="w-9 h-9 md:w-auto md:px-4 bg-white border border-slate-100 rounded-xl shadow-sm text-slate-500 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                            <span className="hidden md:block text-[10px] font-black uppercase tracking-widest">Détails</span>
                                                        </button>

                                                        {currentUser.role === UserRole.ADMIN && (
                                                            <>
                                                                <button
                                                                    onClick={() => setEditModalData({
                                                                        id: leave.id,
                                                                        type: leave.type,
                                                                        start_date: leave.startDate,
                                                                        end_date: leave.endDate
                                                                    })}
                                                                    className="w-9 h-9 bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center"
                                                                    title="Ajuster la demande"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteRequest(leave.id)}
                                                                    className="w-9 h-9 bg-red-50 border border-red-100 rounded-xl shadow-sm text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                                                                    title="Suppression définitive"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                </button>
                                                            </>
                                                        )}

                                                        {leave.status === LeaveStatus.PENDING && (leave.userId === currentUser.id || (currentUser.role === UserRole.ADMIN && leave.status === LeaveStatus.PENDING)) && (
                                                            <button onClick={() => handleCancelRequest(leave.id)} className="w-9 h-9 bg-rose-50 border border-rose-100 rounded-xl shadow-sm text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center" title="Annuler">
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <EditRequestModal
                editRequestModal={editModalData}
                setEditRequestModal={setEditModalData}
                onEditRequest={handleEditRequest}
            />

            {/* Modal de détails */}
            {showDetailsModal && selectedLeave && (
                <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md flex items-center justify-center z-50 p-4 md:p-8 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.2)] max-w-2xl w-full overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
                        <div className="bg-slate-900 p-8 md:p-10 text-white relative">
                            <div className="absolute top-0 right-0 p-8 opacity-20">
                                <span className="text-6xl">{getLeaveTypeIcon(selectedLeave.type)}</span>
                            </div>
                            <div className="relative z-10">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full backdrop-blur-md border border-white/10 mb-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Fiche de de demande</span>
                                </div>
                                <h2 className="text-3xl md:text-4xl font-black tracking-tight">{getLeaveTypeLabel(selectedLeave.type)}</h2>
                                <p className="text-slate-400 mt-2 font-medium flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    {selectedLeave.employeeName} — {selectedLeave.employeeDepartment}
                                </p>
                            </div>
                        </div>

                        <div className="p-8 md:p-10 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Période d'absence</div>
                                    <div className="text-sm font-bold text-slate-900 leading-relaxed">
                                        Du {new Date(selectedLeave.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}<br />
                                        Au {new Date(selectedLeave.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>
                                </div>
                                <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex flex-col justify-center">
                                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Durée du séjour</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-indigo-600">{selectedLeave.duration}</span>
                                        <span className="text-sm font-bold text-indigo-400 uppercase">Jours ouvrés</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {selectedLeave.comment && (
                                    <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Note de l'employé</div>
                                        <p className="text-sm text-slate-600 font-medium italic">"{selectedLeave.comment}"</p>
                                    </div>
                                )}

                                {selectedLeave.managerComment && (
                                    <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl">
                                        <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Décision Management</div>
                                        <p className="text-sm text-amber-900 font-semibold">{selectedLeave.managerComment}</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">État de validation</span>
                                    <div className="mt-1">{getStatusBadge(selectedLeave.status)}</div>
                                </div>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="px-8 py-4 bg-slate-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg hover:shadow-indigo-200"
                                >
                                    Fermer la vue
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification system */}
            {notification && (
                <div className={`fixed bottom-8 right-8 z-[100] p-5 rounded-[2rem] shadow-2xl border-2 flex items-center gap-4 animate-in slide-in-from-bottom-10 fade-in duration-500 min-w-[320px] backdrop-blur-xl ${notification.type === 'success'
                    ? 'bg-emerald-500/95 text-white border-emerald-400'
                    : 'bg-rose-500/95 text-white border-rose-400'
                    }`}>
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">
                        {notification.type === 'success' ? '✨' : '⚠️'}
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{notification.type === 'success' ? 'Succès' : 'Attention'}</p>
                        <p className="text-sm font-bold tracking-tight">{notification.message}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaveHistory;
