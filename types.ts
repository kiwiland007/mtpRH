
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
}

export interface LeaveBalance {
  userId: string;
  totalAccrued: number;
  used: number;
  remaining: number;
  carriedOver: number;
}
