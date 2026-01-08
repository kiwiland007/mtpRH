
import React, { useState, useEffect } from 'react';
import {
    AnnualCarryover,
    CarryoverStatus,
    CarryoverFilters,
    EmployeeBalanceView,
    User,
    AuditAction
} from '../types';
import {
    calculateYearlyBalance,
    calculateCurrentBalance,
    generateCalculationSummary,
    validateCarryover,
    DEFAULT_CARRYOVER_RULE
} from '../utils/carryoverCalculations';

interface CarryoverManagementProps {
    currentUser: User;
    supabaseClient: any;
}

const CarryoverManagement: React.FC<CarryoverManagementProps> = ({ currentUser, supabaseClient }) => {
    const [carryovers, setCarryovers] = useState<EmployeeBalanceView[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<CarryoverFilters>({
        year: new Date().getFullYear(),
        status: undefined,
        department: undefined,
        searchTerm: ''
    });
    const [selectedCarryover, setSelectedCarryover] = useState<EmployeeBalanceView | null>(null);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [recalculating, setRecalculating] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

    // Années disponibles pour le filtre
    const availableYears = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

    // Départements uniques
    const [departments, setDepartments] = useState<string[]>([]);

    useEffect(() => {
        loadCarryovers();
        loadDepartments();
    }, [filters]);

    const loadDepartments = async () => {
        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('department')
                .not('department', 'is', null);

            if (error) throw error;

            const uniqueDepts = [...new Set(data.map((p: any) => p.department))].filter(Boolean);
            setDepartments(uniqueDepts as string[]);
        } catch (error) {
            console.error('Erreur chargement départements:', error);
        }
    };

    const loadCarryovers = async () => {
        setLoading(true);
        try {
            let query = supabaseClient
                .from('annual_carryovers')
                .select(`
          *,
          profiles!annual_carryovers_user_id_fkey (
            id,
            full_name,
            email,
            department,
            hire_date
          )
        `)
                .order('year', { ascending: false });

            // Appliquer les filtres
            if (filters.year) {
                query = query.eq('year', filters.year);
            }
            if (filters.status) {
                query = query.eq('status', filters.status);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Transformer les données
            let transformed: EmployeeBalanceView[] = data.map((item: any) => ({
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
                status: item.status,
                validatedAt: item.validated_at,
                validatedBy: item.validated_by
            }));

            // Filtrer par département
            if (filters.department) {
                transformed = transformed.filter(c => c.department === filters.department);
            }

            // Filtrer par terme de recherche
            if (filters.searchTerm) {
                const term = filters.searchTerm.toLowerCase();
                transformed = transformed.filter(c =>
                    c.fullName.toLowerCase().includes(term) ||
                    c.department.toLowerCase().includes(term)
                );
            }

            setCarryovers(transformed);
        } catch (error: any) {
            showNotification('error', 'Erreur lors du chargement des données: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const recalculateCarryover = async (userId: string, year: number) => {
        setRecalculating(true);
        try {
            // Récupérer les données de l'employé
            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('hire_date, balance_adjustment')
                .eq('id', userId)
                .single();

            if (profileError) throw profileError;

            // Récupérer le report de l'année précédente
            const { data: previousCarryover } = await supabaseClient
                .from('annual_carryovers')
                .select('next_carryover')
                .eq('user_id', userId)
                .eq('year', year - 1)
                .single();

            // Calculer les jours utilisés dans l'année
            const { data: leaveHistory, error: historyError } = await supabaseClient
                .from('leave_history')
                .select('duration')
                .eq('user_id', userId)
                .eq('fiscal_year', year)
                .eq('status', 'APPROVED')
                .eq('leave_type', 'ANNUAL');

            if (historyError) throw historyError;

            const usedDays = leaveHistory?.reduce((sum: number, item: any) => sum + item.duration, 0) || 0;
            const prevCarry = previousCarryover?.next_carryover || 0;

            // Calculer le nouveau solde
            const calculation = calculateYearlyBalance(
                profile.hire_date,
                year,
                usedDays,
                prevCarry,
                DEFAULT_CARRYOVER_RULE
            );

            // Valider le calcul
            const validation = validateCarryover(calculation);
            if (!validation.isValid) {
                throw new Error('Calcul invalide: ' + validation.errors.join(', '));
            }

            // Mettre à jour ou créer l'enregistrement
            const carryoverData = {
                user_id: userId,
                year,
                accrued_days: calculation.accrued,
                used_days: calculation.used,
                remaining_days: calculation.remaining,
                previous_carryover: calculation.previousCarry,
                next_carryover: calculation.nextCarry,
                max_carryover_allowed: calculation.maxCarry,
                forfeited_days: calculation.forfeited,
                status: 'PENDING',
                calculation_details: {
                    yearsOfService: calculation.yearsOfService,
                    annualRate: calculation.annualRate,
                    seniorityBonus: calculation.seniorityBonus,
                    calculatedAt: new Date().toISOString()
                }
            };

            const { error: upsertError } = await supabaseClient
                .from('annual_carryovers')
                .upsert(carryoverData, { onConflict: 'user_id,year' });

            if (upsertError) throw upsertError;

            // Enregistrer dans l'audit trail
            await supabaseClient
                .from('carryover_audit')
                .insert({
                    action: 'RECALCULATE',
                    performed_by: currentUser.id,
                    reason: 'Recalcul automatique',
                    new_values: carryoverData
                });

            showNotification('success', 'Recalcul effectué avec succès');
            loadCarryovers();
        } catch (error: any) {
            showNotification('error', 'Erreur lors du recalcul: ' + error.message);
        } finally {
            setRecalculating(false);
        }
    };

    const validateCarryoverRecord = async (carryover: EmployeeBalanceView, notes?: string) => {
        try {
            const { error } = await supabaseClient
                .from('annual_carryovers')
                .update({
                    status: 'VALIDATED',
                    validated_by: currentUser.id,
                    validated_at: new Date().toISOString(),
                    admin_notes: notes
                })
                .eq('user_id', carryover.userId)
                .eq('year', carryover.year);

            if (error) throw error;

            // Enregistrer dans l'audit trail
            await supabaseClient
                .from('carryover_audit')
                .insert({
                    action: 'VALIDATE',
                    performed_by: currentUser.id,
                    reason: notes || 'Validation administrative',
                    new_values: { status: 'VALIDATED' }
                });

            showNotification('success', 'Report validé avec succès');
            setShowValidationModal(false);
            loadCarryovers();
        } catch (error: any) {
            showNotification('error', 'Erreur lors de la validation: ' + error.message);
        }
    };

    const bulkRecalculate = async () => {
        if (!confirm(`Recalculer tous les reports pour l'année ${filters.year} ?\nCette opération peut prendre quelques instants.`)) {
            return;
        }

        setRecalculating(true);
        try {
            // Récupérer tous les employés actifs
            const { data: employees, error: empError } = await supabaseClient
                .from('profiles')
                .select('id, hire_date')
                .eq('is_active', true);

            if (empError) throw empError;

            let successCount = 0;
            let errorCount = 0;

            for (const emp of employees) {
                try {
                    await recalculateCarryover(emp.id, filters.year || new Date().getFullYear());
                    successCount++;
                } catch (error) {
                    errorCount++;
                    console.error(`Erreur pour l'employé ${emp.id}:`, error);
                }
            }

            showNotification('success', `Recalcul terminé: ${successCount} réussis, ${errorCount} erreurs`);
        } catch (error: any) {
            showNotification('error', 'Erreur lors du recalcul en masse: ' + error.message);
        } finally {
            setRecalculating(false);
        }
    };

    const exportToCSV = () => {
        const headers = [
            'Employé',
            'Département',
            'Année',
            'Jours Acquis',
            'Jours Utilisés',
            'Solde Restant',
            'Report N-1',
            'Report N+1',
            'Jours Perdus',
            'Statut'
        ];

        const rows = carryovers.map(c => [
            c.fullName,
            c.department,
            c.year,
            c.accruedDays,
            c.usedDays,
            c.remainingDays,
            c.previousCarryover,
            c.nextCarryover,
            c.forfeitedDays,
            c.status
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `reports_solde_${filters.year}.csv`;
        link.click();
    };

    const getStatusBadge = (status: CarryoverStatus) => {
        const styles = {
            DRAFT: 'bg-gray-100 text-gray-700',
            PENDING: 'bg-amber-100 text-amber-700',
            VALIDATED: 'bg-emerald-100 text-emerald-700',
            LOCKED: 'bg-slate-700 text-white'
        };

        const labels = {
            DRAFT: 'Brouillon',
            PENDING: 'En attente',
            VALIDATED: 'Validé',
            LOCKED: 'Verrouillé'
        };

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${styles[status]}`}>
                {labels[status]}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-10 text-white relative">
                        <div className="relative z-10">
                            <h1 className="text-4xl font-black tracking-tight">Gestion des Reports de Solde</h1>
                            <p className="text-indigo-100 mt-2 font-medium">
                                Conforme au Code du Travail Marocain (Art. 231, 241, 242)
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
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Année</label>
                                <select
                                    value={filters.year}
                                    onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold focus:border-indigo-500 outline-none transition-all"
                                >
                                    {availableYears.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Département</label>
                                <select
                                    value={filters.department || ''}
                                    onChange={(e) => setFilters({ ...filters, department: e.target.value || undefined })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold focus:border-indigo-500 outline-none transition-all"
                                >
                                    <option value="">Tous les départements</option>
                                    {departments.map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Statut</label>
                                <select
                                    value={filters.status || ''}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value as CarryoverStatus || undefined })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold focus:border-indigo-500 outline-none transition-all"
                                >
                                    <option value="">Tous les statuts</option>
                                    <option value="DRAFT">Brouillon</option>
                                    <option value="PENDING">En attente</option>
                                    <option value="VALIDATED">Validé</option>
                                    <option value="LOCKED">Verrouillé</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Recherche</label>
                                <input
                                    type="text"
                                    placeholder="Nom, département..."
                                    value={filters.searchTerm}
                                    onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-medium focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={bulkRecalculate}
                                disabled={recalculating}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {recalculating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Calcul en cours...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Recalculer tout
                                    </>
                                )}
                            </button>

                            <button
                                onClick={exportToCSV}
                                className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Exporter CSV
                            </button>
                        </div>
                    </div>

                    {/* Statistiques */}
                    <div className="p-8 bg-gradient-to-r from-slate-50 to-indigo-50">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-white rounded-2xl p-6 shadow-lg">
                                <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Total Employés</div>
                                <div className="text-3xl font-black text-slate-900">{carryovers.length}</div>
                            </div>
                            <div className="bg-white rounded-2xl p-6 shadow-lg">
                                <div className="text-xs font-black text-emerald-600 uppercase tracking-wider mb-2">Validés</div>
                                <div className="text-3xl font-black text-emerald-600">
                                    {carryovers.filter(c => c.status === 'VALIDATED').length}
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl p-6 shadow-lg">
                                <div className="text-xs font-black text-amber-600 uppercase tracking-wider mb-2">En Attente</div>
                                <div className="text-3xl font-black text-amber-600">
                                    {carryovers.filter(c => c.status === 'PENDING').length}
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl p-6 shadow-lg">
                                <div className="text-xs font-black text-rose-600 uppercase tracking-wider mb-2">Jours Perdus</div>
                                <div className="text-3xl font-black text-rose-600">
                                    {carryovers.reduce((sum, c) => sum + c.forfeitedDays, 0).toFixed(1)}
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

            {/* Tableau des reports */}
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 overflow-hidden">
                    {loading ? (
                        <div className="p-20 text-center">
                            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-400 font-bold">Chargement des données...</p>
                        </div>
                    ) : carryovers.length === 0 ? (
                        <div className="p-20 text-center">
                            <div className="text-6xl mb-4">📊</div>
                            <p className="text-xl font-bold text-slate-400">Aucun report trouvé</p>
                            <p className="text-sm text-slate-400 mt-2">Modifiez les filtres ou lancez un recalcul</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-900 text-white">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider">Employé</th>
                                        <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider">Département</th>
                                        <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider">Acquis</th>
                                        <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider">Utilisés</th>
                                        <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider">Restant</th>
                                        <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider">Report N-1</th>
                                        <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider">Report N+1</th>
                                        <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider">Perdus</th>
                                        <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider">Statut</th>
                                        <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {carryovers.map((carryover, index) => (
                                        <tr key={`${carryover.userId}-${carryover.year}`} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-sm text-slate-900">{carryover.fullName}</div>
                                                <div className="text-xs text-slate-400">Embauché le {new Date(carryover.hireDate).toLocaleDateString('fr-FR')}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-600">{carryover.department}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm font-bold">
                                                    {carryover.accruedDays}j
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-block bg-rose-100 text-rose-700 px-3 py-1 rounded-lg text-sm font-bold">
                                                    {carryover.usedDays}j
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-block bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-sm font-bold">
                                                    {carryover.remainingDays.toFixed(1)}j
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm font-bold text-slate-600">
                                                {carryover.previousCarryover}j
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-block bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-sm font-bold">
                                                    {carryover.nextCarryover}j
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {carryover.forfeitedDays > 0 ? (
                                                    <span className="inline-block bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-sm font-bold">
                                                        {carryover.forfeitedDays}j
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 text-sm font-bold">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {getStatusBadge(carryover.status)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedCarryover(carryover);
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
                                                    {carryover.status !== 'VALIDATED' && carryover.status !== 'LOCKED' && (
                                                        <>
                                                            <button
                                                                onClick={() => recalculateCarryover(carryover.userId, carryover.year)}
                                                                disabled={recalculating}
                                                                className="p-2 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                                                                title="Recalculer"
                                                            >
                                                                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedCarryover(carryover);
                                                                    setShowValidationModal(true);
                                                                }}
                                                                className="p-2 hover:bg-emerald-50 rounded-lg transition-colors"
                                                                title="Valider"
                                                            >
                                                                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de validation */}
            {showValidationModal && selectedCarryover && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-8">
                    <div className="bg-white rounded-[3rem] shadow-2xl max-w-2xl w-full overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white">
                            <h2 className="text-2xl font-black">Valider le Report</h2>
                            <p className="text-emerald-100 mt-1 font-medium">{selectedCarryover.fullName} - {selectedCarryover.year}</p>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4 p-6 bg-slate-50 rounded-2xl">
                                <div>
                                    <div className="text-xs font-black text-slate-400 uppercase mb-1">Jours Acquis</div>
                                    <div className="text-2xl font-black text-blue-600">{selectedCarryover.accruedDays}j</div>
                                </div>
                                <div>
                                    <div className="text-xs font-black text-slate-400 uppercase mb-1">Jours Utilisés</div>
                                    <div className="text-2xl font-black text-rose-600">{selectedCarryover.usedDays}j</div>
                                </div>
                                <div>
                                    <div className="text-xs font-black text-slate-400 uppercase mb-1">Solde Restant</div>
                                    <div className="text-2xl font-black text-emerald-600">{selectedCarryover.remainingDays.toFixed(1)}j</div>
                                </div>
                                <div>
                                    <div className="text-xs font-black text-slate-400 uppercase mb-1">Report N+1</div>
                                    <div className="text-2xl font-black text-indigo-600">{selectedCarryover.nextCarryover}j</div>
                                </div>
                            </div>

                            {selectedCarryover.forfeitedDays > 0 && (
                                <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl flex gap-3">
                                    <div className="text-2xl">⚠️</div>
                                    <div>
                                        <p className="text-sm font-bold text-amber-900">
                                            {selectedCarryover.forfeitedDays} jours seront perdus
                                        </p>
                                        <p className="text-xs text-amber-700 mt-1">
                                            Dépassement de la limite de report (1/3 du droit annuel)
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Notes administratives (optionnel)</label>
                                <textarea
                                    id="validation-notes"
                                    rows={3}
                                    placeholder="Ajouter des notes ou commentaires..."
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-medium focus:border-emerald-500 outline-none transition-all resize-none"
                                ></textarea>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowValidationModal(false)}
                                    className="flex-1 px-6 py-4 border-2 border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={() => {
                                        const notes = (document.getElementById('validation-notes') as HTMLTextAreaElement)?.value;
                                        validateCarryoverRecord(selectedCarryover, notes);
                                    }}
                                    className="flex-1 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all"
                                >
                                    Valider le Report
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de détails */}
            {showDetailsModal && selectedCarryover && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-8 overflow-y-auto">
                    <div className="bg-white rounded-[3rem] shadow-2xl max-w-4xl w-full my-8">
                        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 text-white">
                            <h2 className="text-2xl font-black">Détails du Report</h2>
                            <p className="text-indigo-100 mt-1 font-medium">{selectedCarryover.fullName} - {selectedCarryover.year}</p>
                        </div>
                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 bg-blue-50 rounded-2xl">
                                    <div className="text-xs font-black text-blue-600 uppercase mb-1">Jours Acquis</div>
                                    <div className="text-3xl font-black text-blue-700">{selectedCarryover.accruedDays}j</div>
                                </div>
                                <div className="p-4 bg-rose-50 rounded-2xl">
                                    <div className="text-xs font-black text-rose-600 uppercase mb-1">Jours Utilisés</div>
                                    <div className="text-3xl font-black text-rose-700">{selectedCarryover.usedDays}j</div>
                                </div>
                                <div className="p-4 bg-emerald-50 rounded-2xl">
                                    <div className="text-xs font-black text-emerald-600 uppercase mb-1">Solde Restant</div>
                                    <div className="text-3xl font-black text-emerald-700">{selectedCarryover.remainingDays.toFixed(1)}j</div>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 rounded-2xl space-y-3">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Informations de Report</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-xs text-slate-500 font-bold">Report de {selectedCarryover.year - 1}</div>
                                        <div className="text-lg font-black text-slate-900">{selectedCarryover.previousCarryover} jours</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 font-bold">Report vers {selectedCarryover.year + 1}</div>
                                        <div className="text-lg font-black text-indigo-600">{selectedCarryover.nextCarryover} jours</div>
                                    </div>
                                    {selectedCarryover.forfeitedDays > 0 && (
                                        <div className="col-span-2">
                                            <div className="text-xs text-amber-600 font-bold">Jours Perdus (limite dépassée)</div>
                                            <div className="text-lg font-black text-amber-700">{selectedCarryover.forfeitedDays} jours</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 bg-indigo-50 rounded-2xl">
                                <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wider mb-3">Références Légales</h3>
                                <ul className="space-y-2 text-sm text-indigo-800">
                                    <li className="flex gap-2">
                                        <span className="font-black">•</span>
                                        <span><strong>Art. 231</strong> : Droit au congé annuel (1.5j/mois = 18j/an)</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="font-black">•</span>
                                        <span><strong>Art. 241</strong> : Majoration d'ancienneté (+1.5j/5ans, max 30j)</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="font-black">•</span>
                                        <span><strong>Art. 242</strong> : Report limité à 1/3 du droit annuel</span>
                                    </li>
                                </ul>
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

export default CarryoverManagement;
