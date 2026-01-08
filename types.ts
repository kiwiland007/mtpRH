
export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
  HR = 'HR',
  ADMIN = 'ADMIN'
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum LeaveType {
  ANNUAL = 'ANNUAL', // Congé annuel
  EXCEPTIONAL = 'EXCEPTIONAL', // Congé exceptionnel (Mariage, Naissance, etc.)
  SICK = 'SICK', // Maladie
  MATERNITY = 'MATERNITY', // Maternité
  RTT = 'RTT'
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string;
  hireDate: string;
  managerId?: string;
  is_active?: boolean;
  balance_adjustment?: number;
  preferences?: {
    email_notifications?: boolean;
    app_notifications?: boolean;
    theme?: 'light' | 'dark';
  };
}

export interface LeaveRequest {
  id: string;
  userId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  comment?: string;
  managerComment?: string;
  createdAt: string;
  duration: number; // calculated days

  // Propriétés additionnelles pour l'historique
  employeeName?: string;
  employeeDepartment?: string;
}

export interface LeaveBalance {
  userId: string;
  totalAccrued: number;
  used: number;
  remaining: number;
  carriedOver: number;
}

// ========================================================================
// GESTION DES REPORTS DE SOLDE ANNUEL
// ========================================================================

export enum CarryoverStatus {
  DRAFT = 'DRAFT',           // Brouillon, en cours de calcul
  PENDING = 'PENDING',       // En attente de validation
  VALIDATED = 'VALIDATED',   // Validé par l'admin
  LOCKED = 'LOCKED'          // Verrouillé (année clôturée)
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  VALIDATE = 'VALIDATE',
  LOCK = 'LOCK',
  RECALCULATE = 'RECALCULATE',
  ADJUST = 'ADJUST'
}

// Report de solde annuel
export interface AnnualCarryover {
  id: string;
  userId: string;
  year: number;

  // Calculs de solde (en jours ouvrables)
  accruedDays: number;        // Jours acquis dans l'année
  usedDays: number;           // Jours consommés
  usedDaysAdjustment?: number; // Ajustement manuel du consommé
  remainingDays: number;      // Solde restant

  // Reports
  previousCarryover: number;  // Report de N-1
  nextCarryover: number;      // Report vers N+1
  maxCarryoverAllowed: number; // Limite légale de report
  forfeitedDays: number;      // Jours perdus (au-delà de la limite)

  // Validation
  status: CarryoverStatus;
  validatedBy?: string;
  validatedAt?: string;

  // Métadonnées
  adminNotes?: string;
  calculationDetails?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Historique des congés pour audit
export interface LeaveHistory {
  id: string;
  userId: string;
  leaveRequestId?: string;

  // Détails du congé
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  duration: number;

  // Statut et validation
  status: LeaveStatus;
  approvedBy?: string;
  approvedAt?: string;

  // Année fiscale d'imputation
  fiscalYear: number;

  // Impact sur le solde
  balanceBefore?: number;
  balanceAfter?: number;

  // Métadonnées
  createdAt: string;
  comment?: string;
  managerComment?: string;
}

// Audit trail des modifications
export interface CarryoverAudit {
  id: string;
  carryoverId: string;
  action: AuditAction;
  performedBy: string;

  // Données avant/après
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;

  // Justification
  reason?: string;

  // Métadonnées techniques
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// Règles de calcul configurables
export interface CarryoverRule {
  id: string;

  // Applicabilité
  department?: string;
  role?: string;
  isDefault: boolean;

  // Règles de calcul
  annualBaseDays: number;           // Base : 18 jours/an
  seniorityBonusDays: number;       // Bonus : 1.5 jours
  seniorityBonusYears: number;      // Tous les 5 ans
  maxAnnualDays: number;            // Plafond : 30 jours

  // Règles de report
  maxCarryoverRatio: number;        // Ratio max (ex: 0.33 = 1/3)
  carryoverExpiryMonths: number;    // Délai d'utilisation (ex: 3 mois)

  // Métadonnées
  effectiveFrom: string;
  effectiveUntil?: string;
  legalReference?: string;
  notes?: string;
}

// Vue consolidée pour le tableau de bord admin
export interface EmployeeBalanceView {
  userId: string;
  fullName: string;
  department: string;
  hireDate: string;
  year: number;

  accruedDays: number;
  usedDays: number;
  usedDaysAdjustment?: number;
  totalUsedDays?: number;
  remainingDays: number;
  previousCarryover: number;
  nextCarryover: number;
  forfeitedDays: number;

  status: CarryoverStatus;
  validatedAt?: string;
  validatedBy?: string;
}

// Résultat de calcul automatique
export interface CarryoverCalculation {
  accrued: number;
  used: number;
  remaining: number;
  previousCarry: number;
  nextCarry: number;
  maxCarry: number;
  forfeited: number;

  // Détails supplémentaires
  yearsOfService?: number;
  annualRate?: number;
  seniorityBonus?: number;
  usedAdjustment?: number;
}

// Filtres pour le tableau de bord admin
export interface CarryoverFilters {
  year?: number;
  department?: string;
  status?: CarryoverStatus;
  searchTerm?: string;
  validatedOnly?: boolean;
}
