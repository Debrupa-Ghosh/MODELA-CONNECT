export type UserRole = 'SUPER_ADMIN' | 'EXECUTIVE_DIRECTOR' | 'HR_MANAGER' | 'EMPLOYEE';

export const USER_ROLES: { role: UserRole; label: string; description: string }[] = [
  { role: 'SUPER_ADMIN', label: 'Super Admin', description: 'Full access to all systems, settings, and administration.' },
  { role: 'EXECUTIVE_DIRECTOR', label: 'Executive Director', description: 'Full administrative access across all organizational enclaves.' },
  { role: 'HR_MANAGER', label: 'HR Manager', description: 'Full access to human resources, workforce, and payroll management.' },
  { role: 'EMPLOYEE', label: 'Employee', description: 'Limited self-service access to dashboard, requests, and attendance.' },
];

export function getRoleLabel(role?: UserRole | string | null): string {
  if (!role) return 'Employee';
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Admin';
    case 'EXECUTIVE_DIRECTOR':
      return 'Executive Director';
    case 'HR_MANAGER':
      return 'HR Manager';
    case 'EMPLOYEE':
      return 'Employee';
    default:
      return role.replace(/_/g, ' ');
  }
}

export function hasFullAccessRole(role?: UserRole | string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'EXECUTIVE_DIRECTOR' || role === 'HR_MANAGER';
}

export type UserStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

export interface User {
  id: string;
  uid: string;
  name: string;
  email: string;
  avatar_url: string;
  status: UserStatus;
  role: UserRole | null;
  requestDate?: string;
  requested_at?: string;
  requestedAt?: string;
  statusUpdatedAt?: string;
  reviewedAt?: string | null;
  actionByUserId?: string | null;
  reviewedBy?: string | null;
  notificationUnread?: boolean;
  employeeId?: string;
  designation?: string;
  department?: string;
  remarks?: string;
}

export type StaffRequestType =
  | 'LEAVE'
  | 'EXPENSE'
  | 'EQUIPMENT'
  | 'SHIFT'
  | 'TRAVEL'
  | 'TRAINING'
  | 'ACCESS_CLEARANCE';

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type RequestPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface StaffWorkflowRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  designation: string;
  type: StaffRequestType;
  title: string;
  description: string;
  amountOrDays: string;
  targetDates?: string;
  priority: RequestPriority;
  status: RequestStatus;
  submittedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  remarks?: string;
  rejectionReason?: string;
  isVerifiedStaff: boolean;
  attachments?: string[];
  justification?: string;
  supervisorName?: string;
}

export interface EmployeeAllowances {
  hra: number;
  medical: number;
  special: number;
  internet: number;
}

export interface EmployeeDeductions {
  professionalTax: number;
  pfContribution: number;
  groupHealthInsurance: number;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  joiningDate: string;
  designation: string;
  phone: string;
  department: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'PROBATION' | 'TERMINATED';
  managerId?: string;
  location?: string;
  compensation: {
    basic: number;
    allowances: number;
    allowanceBreakdown?: EmployeeAllowances;
    deductionBreakdown?: EmployeeDeductions;
    totalDeductions?: number;
    grossSalary?: number;
    netCompensation?: number;
  };
  pan?: string;
  uan?: string;
  bankAccount?: string;
  email?: string;
  avatar?: string;
  documents?: {
    id: string;
    name: string;
    type: string;
    status: string;
    uploadDate: string;
    size?: string;
  }[];
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  checkInTime: string;
  checkOutTime: string;
  verificationMethod: 'FACIAL_AI' | 'BIOMETRIC' | 'MANUAL_OVERRIDE' | 'NFC_BADGE';
  status: 'PRESENT' | 'LATE' | 'REMOTE' | 'ABSENT';
  confidenceScore: number;
  overrideNote?: string;
  overrideSupervisorId?: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  grossSalary?: number;
  status: 'PAID' | 'UNPAID' | 'PROCESSING' | 'PENDING';
  paymentDate?: string;
  disbursedBy?: string;
  lopDays?: number;
  lopAmount?: number;
  allowanceBreakdown?: EmployeeAllowances;
  deductionBreakdown?: EmployeeDeductions & { lop?: number };
  pan?: string;
  bankAccount?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  targetUser?: string;
  executedBy: string;
  details: string;
  userRole?: string;
  module: string;
  recordId?: string;
  result: 'SUCCESS' | 'FAILURE' | 'WARNING';
}

export interface OnboardingCandidate {
  id: string;
  fullName: string;
  email: string;
  role: string;
  department: string;
  startDate: string;
  stage: 'OFFER_ACCEPTED' | 'DOCUMENTS_PENDING' | 'IT_PROVISIONING' | 'ORIENTATION' | 'COMPLETED';
  progress: number;
  assignedBuddy: string;
}

/**
 * Validates whether a staff workflow request was filed by and belongs to the specified employee user.
 * Rejects requests if applicant name or employeeId explicitly belongs to a different employee.
 */
export function isRequestOwnedByUser(
  req: { employeeId?: string; employeeName?: string; employeeEmail?: string },
  user: { id?: string; employeeId?: string; name?: string; email?: string } | null
): boolean {
  if (!user) return false;

  const userEmail = (user.email || '').toLowerCase().trim();
  const userName = (user.name || '').toLowerCase().trim();
  const userEmpId = (user.employeeId || '').toUpperCase().trim();
  const userId = (user.id || '').toUpperCase().trim();

  const reqEmail = (req.employeeEmail || '').toLowerCase().trim();
  const reqName = (req.employeeName || '').toLowerCase().trim();
  const reqEmpId = (req.employeeId || '').toUpperCase().trim();

  // If applicant name is explicitly present on request and differs from user's name, it's not theirs
  if (reqName && userName && reqName !== userName) {
    return false;
  }

  // If employee ID is explicitly present on request and differs from user's employeeId/id, it's not theirs
  if (reqEmpId && (userEmpId || userId) && reqEmpId !== userEmpId && reqEmpId !== userId) {
    return false;
  }

  // Must positively match either employeeId, name, or email
  const idMatch = Boolean((userEmpId && reqEmpId === userEmpId) || (userId && reqEmpId === userId));
  const nameMatch = Boolean(userName && reqName && reqName === userName);
  const emailMatch = Boolean(userEmail && reqEmail && reqEmail === userEmail);

  return idMatch || nameMatch || emailMatch;
}
