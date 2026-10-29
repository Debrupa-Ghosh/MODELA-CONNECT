import { User, Employee, StaffWorkflowRequest, AttendanceRecord, PayrollRecord, AuditLog, OnboardingCandidate } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: "USR-Q94BIIQ5",
    uid: "USR-Q94BIIQ5",
    name: "Sushoovan Das",
    email: "sushovand@modelatech.com",
    avatar_url: "https://ui-avatars.com/api/?name=Sushoovan+Das&background=3b82f6&color=fff",
    status: "APPROVED",
    role: "SUPER_ADMIN",
    employeeId: "MOD001",
    designation: "Executive Director & Super Admin",
    department: "Executive Office",
    requestedAt: "2026-09-20T08:44:15.481Z",
    reviewedAt: "2026-09-20T08:44:35.660Z",
    reviewedBy: "System Root"
  },
  {
    id: "USR-ADITI-008",
    uid: "USR-ADITI-008",
    name: "Aditi Chakrabarty",
    email: "aditichakraborty2005@gmail.com",
    avatar_url: "https://ui-avatars.com/api/?name=Aditi+Chakrabarty&background=0284c7&color=fff",
    status: "APPROVED",
    role: "EMPLOYEE",
    employeeId: "MOD008",
    designation: "Staff Candidate",
    department: "General Staff",
    requestedAt: "2026-10-29T05:00:00.000Z",
    reviewedAt: "2026-10-29T05:05:00.000Z",
    reviewedBy: "System Root"
  },
  {
    id: "USR-SURUPA-011",
    uid: "USR-SURUPA-011",
    name: "Debrupa Ghosh",
    email: "surupa008@gmail.com",
    avatar_url: "https://ui-avatars.com/api/?name=Debrupa+Ghosh&background=0284c7&color=fff",
    status: "APPROVED",
    role: "EMPLOYEE",
    employeeId: "MOD011",
    designation: "Staff Candidate",
    department: "General Staff",
    requestedAt: "2026-10-22T08:00:00.000Z",
    reviewedAt: "2026-10-22T08:05:00.000Z",
    reviewedBy: "System Root"
  }
];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: "MOD001",
    firstName: "Sushoovan",
    lastName: "Das",
    email: "sushovand@modelatech.com",
    joiningDate: "2024-01-15",
    designation: "Executive Director & Super Admin",
    phone: "+1 (555) 234-5678",
    department: "Executive Office",
    status: "ACTIVE",
    location: "San Francisco HQ",
    compensation: { basic: 85000, allowances: 25000 },
    pan: "DASSV1989K",
    bankAccount: "815801500111",
    avatar: "https://ui-avatars.com/api/?name=Sushoovan+Das&background=3b82f6&color=fff"
  },
  {
    id: "MOD008",
    firstName: "Aditi",
    lastName: "Chakrabarty",
    email: "aditichakraborty2005@gmail.com",
    joiningDate: "2026-10-29",
    designation: "Staff Candidate",
    phone: "",
    department: "General Staff",
    status: "ACTIVE",
    location: "San Francisco HQ",
    compensation: { basic: 50000, allowances: 15000 },
    avatar: "https://ui-avatars.com/api/?name=Aditi+Chakrabarty&background=0284c7&color=fff"
  },
  {
    id: "MOD011",
    firstName: "Debrupa",
    lastName: "Ghosh",
    email: "surupa008@gmail.com",
    joiningDate: "2026-10-22",
    designation: "Staff Candidate",
    phone: "",
    department: "General Staff",
    status: "ACTIVE",
    location: "San Francisco HQ",
    compensation: { basic: 50000, allowances: 15000 },
    avatar: "https://ui-avatars.com/api/?name=Debrupa+Ghosh&background=0284c7&color=fff"
  }
];

// VERIFIED STAFF WORKFLOW REQUESTS (for the Requests tab / Requests & Approvals Central)
export const INITIAL_STAFF_REQUESTS: StaffWorkflowRequest[] = [];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: "ATT-1001",
    employeeId: "MOD001",
    employeeName: "Sushoovan Das",
    department: "Executive Office",
    date: "2026-10-02",
    checkInTime: "08:30 AM",
    checkOutTime: "--:--",
    verificationMethod: "FACIAL_AI",
    status: "PRESENT",
    confidenceScore: 99.4
  },
  {
    id: "ATT-1004",
    employeeId: "MOD007",
    employeeName: "Debrupa Ghosh",
    department: "Engineering",
    date: "2026-10-02",
    checkInTime: "08:55 AM",
    checkOutTime: "--:--",
    verificationMethod: "FACIAL_AI",
    status: "PRESENT",
    confidenceScore: 99.1
  },
  {
    id: "ATT-1005",
    employeeId: "MOD005",
    employeeName: "Sourav Ganguly",
    department: "Engineering",
    date: "2026-10-02",
    checkInTime: "09:18 AM",
    checkOutTime: "--:--",
    verificationMethod: "FACIAL_AI",
    status: "LATE",
    confidenceScore: 98.2
  }
];

export const INITIAL_PAYROLL: PayrollRecord[] = [
  {
    id: "PAY-2026-09-01",
    employeeId: "MOD001",
    employeeName: "Sushoovan Das",
    month: "September",
    year: 2026,
    basicSalary: 85000,
    allowances: 25000,
    deductions: 3700,
    grossSalary: 110000,
    netSalary: 106300,
    status: "PAID",
    paymentDate: "2026-09-30",
    disbursedBy: "System Master Disburser",
    lopDays: 0,
    lopAmount: 0,
    allowanceBreakdown: {
      hra: 10000,
      medical: 4000,
      special: 9000,
      internet: 2000
    },
    deductionBreakdown: {
      professionalTax: 200,
      pfContribution: 1800,
      groupHealthInsurance: 1700,
      lop: 0
    }
  },
  {
    id: "PAY-2026-10-01",
    employeeId: "MOD001",
    employeeName: "Sushoovan Das",
    month: "October",
    year: 2026,
    basicSalary: 85000,
    allowances: 25000,
    deductions: 3700,
    grossSalary: 110000,
    netSalary: 106300,
    status: "PAID",
    paymentDate: "2026-10-15",
    disbursedBy: "System Master Disburser",
    lopDays: 0,
    lopAmount: 0,
    allowanceBreakdown: {
      hra: 10000,
      medical: 4000,
      special: 9000,
      internet: 2000
    },
    deductionBreakdown: {
      professionalTax: 200,
      pfContribution: 1800,
      groupHealthInsurance: 1700,
      lop: 0
    }
  },
  {
    id: "PAY-2026-OCT-MOD011",
    employeeId: "MOD011",
    employeeName: "Debrupa Ghosh",
    month: "October",
    year: 2026,
    basicSalary: 50000,
    allowances: 15000,
    deductions: 3700,
    grossSalary: 65000,
    netSalary: 61300,
    status: "PAID",
    paymentDate: "2026-10-15",
    disbursedBy: "System Master Disburser",
    lopDays: 0,
    lopAmount: 0,
    allowanceBreakdown: {
      hra: 6000,
      medical: 2250,
      special: 5250,
      internet: 1500
    },
    deductionBreakdown: {
      professionalTax: 200,
      pfContribution: 1800,
      groupHealthInsurance: 1700,
      lop: 0
    }
  },
  {
    id: "PAY-2026-NOV-MOD011",
    employeeId: "MOD011",
    employeeName: "Debrupa Ghosh",
    month: "November",
    year: 2026,
    basicSalary: 50000,
    allowances: 15000,
    deductions: 3700,
    grossSalary: 65000,
    netSalary: 61300,
    status: "UNPAID",
    paymentDate: "",
    disbursedBy: "",
    lopDays: 0,
    lopAmount: 0,
    allowanceBreakdown: {
      hra: 6000,
      medical: 2250,
      special: 5250,
      internet: 1500
    },
    deductionBreakdown: {
      professionalTax: 200,
      pfContribution: 1800,
      groupHealthInsurance: 1700,
      lop: 0
    }
  },
  {
    id: "PAY-2026-DEC-MOD011",
    employeeId: "MOD011",
    employeeName: "Debrupa Ghosh",
    month: "December",
    year: 2026,
    basicSalary: 50000,
    allowances: 15000,
    deductions: 3700,
    grossSalary: 65000,
    netSalary: 61300,
    status: "UNPAID",
    paymentDate: "",
    disbursedBy: "",
    lopDays: 0,
    lopAmount: 0,
    allowanceBreakdown: {
      hra: 6000,
      medical: 2250,
      special: 5250,
      internet: 1500
    },
    deductionBreakdown: {
      professionalTax: 200,
      pfContribution: 1800,
      groupHealthInsurance: 1700,
      lop: 0
    }
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: "LOG-INIT-001",
    timestamp: "2026-10-02T06:38:58.366Z",
    action: "Super Admin Sign In",
    targetUser: "sushoovandas@gmail.com",
    executedBy: "sushoovandas@gmail.com",
    details: "Authorized Super Admin logged into Architect Terminal: Sushoovan Das",
    userRole: "SUPER_ADMIN",
    module: "Auth",
    recordId: "USR-Q94BIIQ5",
    result: "SUCCESS"
  },
  {
    id: "LOG-INIT-002",
    timestamp: "2026-10-02T06:37:42.653Z",
    action: "User Approved & Role Assigned",
    targetUser: "ghoshdebrupa005@gmail.com",
    executedBy: "modelatech2026@gmail.com",
    details: "Verified staff access granted with role EMPLOYEE to Debrupa Ghosh",
    userRole: "SUPER_ADMIN",
    module: "User Management",
    recordId: "USR-OBOPA1GQ",
    result: "SUCCESS"
  },
  {
    id: "LOG-INIT-003",
    timestamp: "2026-10-02T06:30:12.110Z",
    action: "Staff Request Submitted",
    targetUser: "elena.rostova@modela.io",
    executedBy: "elena.rostova@modela.io",
    details: "New staff workflow requisition REQ-1041 submitted by Elena Rostova",
    userRole: "EMPLOYEE",
    module: "Requests",
    recordId: "REQ-1041",
    result: "SUCCESS"
  },
  {
    id: "LOG-INIT-004",
    timestamp: "2026-10-02T06:12:05.400Z",
    action: "Facial Biometric Verification",
    targetUser: "ghoshdebrupa005@gmail.com",
    executedBy: "Kiosk AI Sensor",
    details: "Attendance check-in logged via Facial AI (Confidence: 99.1%)",
    userRole: "EMPLOYEE",
    module: "Attendance",
    recordId: "ATT-1004",
    result: "SUCCESS"
  }
];

export const INITIAL_ONBOARDING: OnboardingCandidate[] = [
  {
    id: "ONB-01",
    fullName: "Aditi Chakraborty",
    email: "aditichakraborty2005@gmail.com",
    role: "QA Automation Engineer",
    department: "Quality Assurance",
    startDate: "2026-10-15",
    stage: "DOCUMENTS_PENDING",
    progress: 45,
    assignedBuddy: "Debrupa Ghosh"
  },
  {
    id: "ONB-02",
    fullName: "Vikram Sengupta",
    email: "vikram.sengupta@gmail.com",
    role: "DevOps Engineer",
    department: "Operations",
    startDate: "2026-10-20",
    stage: "IT_PROVISIONING",
    progress: 70,
    assignedBuddy: "Elena Rostova"
  }
];
