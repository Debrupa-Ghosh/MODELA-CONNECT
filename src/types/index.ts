export type UserRole =
  | 'SUPER_ADMIN'
  | 'DIRECTOR'
  | 'HR'
  | 'MANAGER'
  | 'EMPLOYEE'
  | 'EXECUTIVE_DIRECTOR'
  | 'HR_MANAGER';

export const USER_ROLES: { role: UserRole; label: string; description: string }[] = [
  { role: 'SUPER_ADMIN', label: 'Super Admin', description: 'Full access to all systems, settings, and administration.' },
  { role: 'DIRECTOR', label: 'Director', description: 'Full administrative access across all organizational enclaves.' },
  { role: 'HR', label: 'HR', description: 'Full access to human resources, workforce, and payroll management.' },
  { role: 'MANAGER', label: 'Manager', description: 'Full management access and approval authority for Leave Requests.' },
  { role: 'EMPLOYEE', label: 'Employee', description: 'Limited self-service access to dashboard and personal requests.' },
];

export function normalizeRole(role?: UserRole | string | null): 'SUPER_ADMIN' | 'DIRECTOR' | 'HR' | 'MANAGER' | 'EMPLOYEE' {
  if (!role) return 'EMPLOYEE';
  const r = role.toUpperCase().trim();
  if (r === 'SUPER_ADMIN' || r === 'SUPER ADMIN') return 'SUPER_ADMIN';
  if (r === 'DIRECTOR' || r === 'EXECUTIVE_DIRECTOR' || r === 'EXECUTIVE DIRECTOR') return 'DIRECTOR';
  if (r === 'HR' || r === 'HR_MANAGER' || r === 'HR MANAGER') return 'HR';
  if (r === 'MANAGER') return 'MANAGER';
  return 'EMPLOYEE';
}

export function getRoleLabel(role?: UserRole | string | null): string {
  if (!role) return 'Employee';
  const norm = normalizeRole(role);
  switch (norm) {
    case 'SUPER_ADMIN':
      return 'Super Admin';
    case 'DIRECTOR':
      return 'Director';
    case 'HR':
      return 'HR';
    case 'MANAGER':
      return 'Manager';
    case 'EMPLOYEE':
      return 'Employee';
    default:
      return role.replace(/_/g, ' ');
  }
}

export function hasFullAccessRole(role?: UserRole | string | null): boolean {
  const norm = normalizeRole(role);
  // Super Admin, Director, HR, Manager will have all access; only Employee will have limited access.
  return norm === 'SUPER_ADMIN' || norm === 'DIRECTOR' || norm === 'HR' || norm === 'MANAGER';
}

/**
 * Requirement 2:
 * Only Leave Request can be approved by Manager but the request can be viewed by HR,Super Admin,Director.
 */
export function canUserApproveRequest(role?: UserRole | string | null, requestType?: StaffRequestType | string): boolean {
  if (!role) return false;
  const norm = normalizeRole(role);
  const isLeave = (requestType || '').toUpperCase() === 'LEAVE';

  // Manager can ONLY approve Leave Requests
  if (norm === 'MANAGER') {
    return isLeave;
  }

  // Super Admin, Director, HR can view Leave Requests, but CANNOT approve them (only Manager can approve Leave Requests).
  // They can approve all other request types (Expense, Equipment, Shift, Travel, Training, etc.).
  if (norm === 'SUPER_ADMIN' || norm === 'DIRECTOR' || norm === 'HR') {
    return !isLeave;
  }

  // Employees have limited self-service access and cannot approve requests
  return false;
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
  manualStatusOverride?: boolean;
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
