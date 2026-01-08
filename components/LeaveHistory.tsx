
import React, { useState, useEffect } from 'react';
import { User, UserRole, LeaveRequest, LeaveType, LeaveStatus } from '../types';
import { calculateBusinessDays } from '../utils/calculations';

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
        employeeId: currentUser.role === UserRole.EMPLOYEE ? currentUser.id : undefined
    });
    const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

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
                .select(`
          *,
          profiles!leave_requests_user_id_fkey (
            id,
            full_name,
            email,
            department,
            hire_date
          )
        `)
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

            let mappedData: LeaveRequest[] = (data || []).map((item: any) => ({
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
                employeeName: item.profiles?.full_name || 'N/A',
                employeeDepartment: item.profiles?.department || 'N/A'
            }));

            // Filtre par recherche
            if (filters.searchTerm) {
                const term = filters.searchTerm.toLowerCase();
                mappedData = mappedData.filter(leave =>
                    leave.employeeName?.toLowerCase().includes(term) ||
                    leave.employeeDepartment?.toLowerCase().includes(term) ||
                    leave.comment?.toLowerCase().includes(term)
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-10 text-white relative">
                        <div className="relative z-10">
                            <h1 className="text-4xl font-black tracking-tight">Historique des Congés</h1>
                            <p className="text-blue-100 mt-2 font-medium">
                                Registre complet et détaillé de toutes les demandes de congés
                            </p>
                        </div>
                        <div className="absolute top-0 right-0 p-10 opacity-20">
                            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
                            </svg>
                        </div>
                    </div>

                    {/* Filtres */}
                    <div className="p-8 border-b border-slate-200">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Période</label>
                                <select
                                    value={filters.period}
                                    onChange={(e) => setFilters({ ...filters, period: e.target.value as any })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                                >
                                    <option value="month">Mois en cours</option>
                                    <option value="quarter">Trimestre</option>
                                    <option value="year">Année en cours</option>
                                    <option value="all">Toutes</option>
                                    <option value="custom">Personnalisée</option>
                                </select>
                            </div>

                            {currentUser.role !== UserRole.EMPLOYEE && (
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Employé</label>
                                    <select
                                        value={filters.employeeId || ''}
                                        onChange={(e) => setFilters({ ...filters, employeeId: e.target.value || undefined })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                                    >
                                        <option value="">Tous les employés</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Type de congé</label>
                                <select
                                    value={filters.leaveType || 'all'}
                                    onChange={(e) => setFilters({ ...filters, leaveType: e.target.value as any })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                                >
                                    <option value="all">Tous les types</option>
                                    <option value="ANNUAL">Congé Annuel</option>
                                    <option value="SICK">Maladie</option>
                                    <option value="MATERNITY">Maternité</option>
                                    <option value="EXCEPTIONAL">Exceptionnel</option>
                                    <option value="RTT">RTT</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Statut</label>
                                <select
                                    value={filters.status || 'all'}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                                >
                                    <option value="all">Tous les statuts</option>
                                    <option value="PENDING">En attente</option>
                                    <option value="APPROVED">Approuvé</option>
                                    <option value="REJECTED">Rejeté</option>
                                    <option value="CANCELLED">Annulé</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Recherche</label>
                                <input
                                    type="text"
                                    placeholder="Nom, département..."
                                    value={filters.searchTerm}
                                    onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-medium focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Période personnalisée */}
                        {filters.period === 'custom' && (
                            <div className="grid grid-cols-2 gap-6 mt-6 p-6 bg-slate-50 rounded-2xl">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Date de début</label>
                                    <input
                                        type="date"
                                        value={filters.startDate || ''}
                                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                        className="w-full bg-white border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Date de fin</label>
                                    <input
                                        type="date"
                                        value={filters.endDate || ''}
                                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                        className="w-full bg-white border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Actions d'export */}
                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={exportToExcel}
                                className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Exporter Excel
                            </button>

                            <button
                                onClick={exportToPDF}
                                className="bg-rose-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Exporter PDF
                            </button>

                            <button
                                onClick={loadData}
                                className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Actualiser
                            </button>
                        </div>
                    </div>

                    {/* Statistiques */}
                    <div className="p-8 bg-gradient-to-r from-slate-50 to-blue-50">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-white rounded-2xl p-6 shadow-lg">
                                <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Total Demandes</div>
                                <div className="text-3xl font-black text-slate-900">{history.length}</div>
                            </div>
                            <div className="bg-white rounded-2xl p-6 shadow-lg">
                                <div className="text-xs font-black text-emerald-600 uppercase tracking-wider mb-2">Approuvées</div>
                                <div className="text-3xl font-black text-emerald-600">
                                    {history.filter(h => h.status === 'APPROVED').length}
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl p-6 shadow-lg">
                                <div className="text-xs font-black text-amber-600 uppercase tracking-wider mb-2">En Attente</div>
                                <div className="text-3xl font-black text-amber-600">
                                    {history.filter(h => h.status === 'PENDING').length}
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl p-6 shadow-lg">
                                <div className="text-xs font-black text-blue-600 uppercase tracking-wider mb-2">Jours Totaux</div>
                                <div className="text-3xl font-black text-blue-600">
                                    {history.filter(h => h.status === 'APPROVED').reduce((sum, h) => sum + h.duration, 0)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification */}
            {notification && (
                <div className={`fixed top-8 right-8 z-50 p-6 rounded-2xl shadow-2xl animate-slide-in-right ${notification.type === 'success' ? 'bg-emerald-500' :
                    notification.type === 'error' ? 'bg-rose-500' : 'bg-blue-500'
                    } text-white max-w-md`}>
                    <div className="flex items-start gap-4">
                        <div className="text-2xl">
                            {notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'}
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-sm">{notification.message}</p>
                        </div>
                        <button
                            onClick={() => setNotification(null)}
                            className="text-white/80 hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Tableau de l'historique */}
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 overflow-hidden">
                    {loading ? (
                        <div className="p-20 text-center">
                            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-400 font-bold">Chargement de l'historique...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="p-20 text-center">
                            <div className="text-6xl mb-4">📋</div>
                            <p className="text-xl font-bold text-slate-400">Aucune demande trouvée</p>
                            <p className="text-sm text-slate-400 mt-2">Modifiez les filtres pour voir plus de résultats</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-900 text-white">
                                    <tr>
                                        {currentUser.role !== UserRole.EMPLOYEE && (
                                            <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider">Employé</th>
                                        )}
                                        <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider">Début</th>
                                        <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider">Fin</th>
                                        <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider">Durée</th>
                                        <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider">Statut</th>
                                        {currentUser.role !== UserRole.EMPLOYEE && (
                                            <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider">Solde</th>
                                        )}
                                        <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {history.map((leave) => {
                                        const balance = getBalance(leave.userId);
                                        return (
                                            <tr key={leave.id} className="hover:bg-slate-50 transition-colors">
                                                {currentUser.role !== UserRole.EMPLOYEE && (
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-sm text-slate-900">{leave.employeeName}</div>
                                                        <div className="text-xs text-slate-400">{leave.employeeDepartment}</div>
                                                    </td>
                                                )}
                                                <td className="px-6 py-4">
                                                    <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold">
                                                        {getLeaveTypeLabel(leave.type)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm font-medium text-slate-600">
                                                    {new Date(leave.startDate).toLocaleDateString('fr-FR')}
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm font-medium text-slate-600">
                                                    {new Date(leave.endDate).toLocaleDateString('fr-FR')}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-block bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-sm font-bold">
                                                        {leave.duration}j
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {getStatusBadge(leave.status)}
                                                </td>
                                                {currentUser.role !== UserRole.EMPLOYEE && balance && (
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="text-sm font-bold text-emerald-600">{balance.remaining}j</div>
                                                        <div className="text-xs text-slate-400">sur {balance.totalAccrued}j</div>
                                                    </td>
                                                )}
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedLeave(leave);
                                                            setShowDetailsModal(true);
                                                        }}
                                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="Voir détails"
                                                    >
                                                        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </button>
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

            {/* Modal de détails */}
            {showDetailsModal && selectedLeave && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-8">
                    <div className="bg-white rounded-[3rem] shadow-2xl max-w-2xl w-full overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
                            <h2 className="text-2xl font-black">Détails de la Demande</h2>
                            <p className="text-blue-100 mt-1 font-medium">{getLeaveTypeLabel(selectedLeave.type)}</p>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <div className="text-xs font-black text-slate-400 uppercase mb-1">Date de début</div>
                                    <div className="text-lg font-black text-slate-900">
                                        {new Date(selectedLeave.startDate).toLocaleDateString('fr-FR', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <div className="text-xs font-black text-slate-400 uppercase mb-1">Date de fin</div>
                                    <div className="text-lg font-black text-slate-900">
                                        {new Date(selectedLeave.endDate).toLocaleDateString('fr-FR', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </div>
                                </div>
                                <div className="p-4 bg-indigo-50 rounded-2xl">
                                    <div className="text-xs font-black text-indigo-600 uppercase mb-1">Durée</div>
                                    <div className="text-2xl font-black text-indigo-700">{selectedLeave.duration} jours</div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <div className="text-xs font-black text-slate-400 uppercase mb-1">Statut</div>
                                    <div className="mt-1">{getStatusBadge(selectedLeave.status)}</div>
                                </div>
                            </div>

                            {selectedLeave.comment && (
                                <div className="p-4 bg-blue-50 rounded-2xl">
                                    <div className="text-xs font-black text-blue-600 uppercase mb-2">Commentaire</div>
                                    <p className="text-sm text-blue-900">{selectedLeave.comment}</p>
                                </div>
                            )}

                            {selectedLeave.managerComment && (
                                <div className="p-4 bg-amber-50 rounded-2xl">
                                    <div className="text-xs font-black text-amber-600 uppercase mb-2">Commentaire du Manager</div>
                                    <p className="text-sm text-amber-900">{selectedLeave.managerComment}</p>
                                </div>
                            )}

                            <div className="p-4 bg-slate-50 rounded-2xl">
                                <div className="text-xs font-black text-slate-400 uppercase mb-2">Informations</div>
                                <div className="space-y-1 text-sm text-slate-600">
                                    <p><strong>Demandé le :</strong> {new Date(selectedLeave.createdAt).toLocaleDateString('fr-FR')}</p>
                                    {currentUser.role !== UserRole.EMPLOYEE && (
                                        <>
                                            <p><strong>Employé :</strong> {selectedLeave.employeeName}</p>
                                            <p><strong>Département :</strong> {selectedLeave.employeeDepartment}</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="w-full px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaveHistory;
