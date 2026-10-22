import { User, Employee, StaffWorkflowRequest, AttendanceRecord, PayrollRecord, AuditLog, OnboardingCandidate } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: "USR-SUPERADMIN-01",
    uid: "USR-SUPERADMIN-01",
    name: "Modela Tech",
    email: "modelatech2026@gmail.com",
    avatar_url: "https://ui-avatars.com/api/?name=Modela+Tech&background=0284c7&color=fff",
    status: "APPROVED",
    role: "SUPER_ADMIN",
    employeeId: "MOD000",
    designation: "Executive Director & Super Admin",
    department: "Executive Office",
    requestedAt: "2026-09-20T08:00:00.000Z",
    reviewedAt: "2026-09-20T08:00:00.000Z",
    reviewedBy: "System Root"
  },
  {
    id: "USR-Q94BIIQ5",
    uid: "USR-Q94BIIQ5",
    name: "Sushoovan Das",
    email: "sushoovandas@gmail.com",
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
    id: "USR-HR-MGR01",
    uid: "USR-HR-MGR01",
    name: "Marcus Vance",
    email: "marcus.vance@modela.io",
    avatar_url: "https://ui-avatars.com/api/?name=Marcus+Vance&background=6366f1&color=fff",
    status: "APPROVED",
    role: "HR_MANAGER",
    employeeId: "MOD003",
    designation: "HR Operations Manager",
    department: "Human Resources",
    requestedAt: "2026-09-22T10:00:00.000Z",
    reviewedAt: "2026-09-22T10:05:00.000Z",
    reviewedBy: "Sushoovan Das"
  },
  {
    id: "USR-OBOPA1GQ",
    uid: "USR-OBOPA1GQ",
    name: "Debrupa Ghosh",
    email: "ghoshdebrupa005@gmail.com",
    avatar_url: "https://ui-avatars.com/api/?name=Debrupa+Ghosh&background=0284c7&color=fff",
    status: "APPROVED",
    role: "EMPLOYEE",
    employeeId: "MOD007",
    designation: "Full Stack Engineer",
    department: "Engineering",
    requestedAt: "2026-10-02T06:37:31.931Z",
    reviewedAt: "2026-10-02T06:37:42.653Z",
    reviewedBy: "modelatech2026@gmail.com"
  },
  // Pending signup verification requests (4 requests matching Image 3!)
  {
    id: "USR-PENDING-DEBRUPA",
    uid: "USR-PENDING-DEBRUPA",
    name: "Debrupa123",
    email: "debrupa123@gmail.com",
    avatar_url: "https://ui-avatars.com/api/?name=Debrupa+123&background=0284c7&color=fff",
    status: "PENDING",
    role: null,
    department: "Engineering",
    designation: "Full Stack Engineer Candidate",
    requestedAt: "2026-10-02T13:23:00.000Z",
    notificationUnread: true
  },
  {
    id: "USR-PENDING-01",
    uid: "USR-PENDING-01",
    name: "Aditi Chakraborty",
    email: "aditichakraborty2005@gmail.com",
    avatar_url: "https://ui-avatars.com/api/?name=Aditi+Chakraborty&background=f59e0b&color=fff",
    status: "PENDING",
    role: null,
    department: "Quality Assurance",
    designation: "QA Engineer Candidate",
    requestedAt: "2026-10-01T14:30:00.000Z",
    notificationUnread: true
  },
  {
    id: "USR-QYG6APLC",
    uid: "USR-QYG6APLC",
    name: "Deb Chatterjee",
    email: "deb@gmail.com",
    avatar_url: "https://ui-avatars.com/api/?name=Deb+Chatterjee&background=0284c7&color=fff",
    status: "PENDING",
    role: null,
    department: "Product Design",
    designation: "UI/UX Designer Candidate",
    requestedAt: "2026-10-02T06:28:52.741Z",
    notificationUnread: true
  },
  {
    id: "USR-PENDING-03",
    uid: "USR-PENDING-03",
    name: "Vikram Sengupta",
    email: "vikram.sengupta@gmail.com",
    avatar_url: "https://ui-avatars.com/api/?name=Vikram+Sengupta&background=10b981&color=fff",
    status: "PENDING",
    role: null,
    department: "Operations",
    designation: "DevOps Engineer Candidate",
    requestedAt: "2026-10-02T08:12:10.000Z",
    notificationUnread: true
  }
];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: "MOD000",
    firstName: "Modela",
    lastName: "Tech",
    email: "modelatech2026@gmail.com",
    joiningDate: "2024-01-01",
    designation: "Executive Director & Super Admin",
    phone: "+1 (555) 123-4567",
    department: "Executive Office",
    status: "ACTIVE",
    location: "San Francisco HQ",
    compensation: { basic: 95000, allowances: 30000 },
    pan: "MODTK2026F",
    bankAccount: "815801500000",
    avatar: "https://ui-avatars.com/api/?name=Modela+Tech&background=0284c7&color=fff"
  },
  {
    id: "MOD001",
    firstName: "Sushoovan",
    lastName: "Das",
    email: "sushoovandas@gmail.com",
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
    id: "MOD003",
    firstName: "Marcus",
    lastName: "Vance",
    email: "marcus.vance@modela.io",
    joiningDate: "2024-05-10",
    designation: "HR Operations Manager",
    phone: "+1 (555) 456-7890",
    department: "Human Resources",
    status: "ACTIVE",
    location: "New York Regional Office",
    compensation: { basic: 48000, allowances: 14000 },
    pan: "VNCMR1992P",
    bankAccount: "815801500333",
    avatar: "https://ui-avatars.com/api/?name=Marcus+Vance&background=6366f1&color=fff"
  },
  {
    id: "MOD007",
    firstName: "Debrupa",
    lastName: "Ghosh",
    email: "ghoshdebrupa005@gmail.com",
    joiningDate: "2024-06-01",
    designation: "Full Stack Engineer",
    phone: "+1 (555) 345-6789",
    department: "Engineering",
    status: "ACTIVE",
    location: "San Francisco HQ",
    compensation: { basic: 50000, allowances: 14000 },
    pan: "ITHPK8827F",
    bankAccount: "815801500344",
    avatar: "https://ui-avatars.com/api/?name=Debrupa+Ghosh&background=0284c7&color=fff"
  },
  {
    id: "MOD005",
    firstName: "Sourav",
    lastName: "Ganguly",
    email: "sourav.ganguly@modela.io",
    joiningDate: "2024-09-01",
    designation: "Senior BIM Engineer",
    phone: "+1 (555) 678-9012",
    department: "Engineering",
    status: "ACTIVE",
    location: "Kolkata Tech Hub",
    compensation: { basic: 45000, allowances: 12000 },
    pan: "GNGLS1972B",
    bankAccount: "815801500555",
    avatar: "https://ui-avatars.com/api/?name=Sourav+Ganguly&background=f59e0b&color=fff"
  },
  {
    id: "MOD006",
    firstName: "Pooja",
    lastName: "Sharma",
    email: "pooja.sharma@modela.io",
    joiningDate: "2024-10-15",
    designation: "MEP Designer",
    phone: "+1 (555) 789-0123",
    department: "Design",
    status: "ACTIVE",
    location: "San Francisco HQ",
    compensation: { basic: 42000, allowances: 11000 },
    avatar: "https://ui-avatars.com/api/?name=Pooja+Sharma&background=ec4899&color=fff"
  }
];

// VERIFIED STAFF WORKFLOW REQUESTS (for the Requests tab / Requests & Approvals Central)
export const INITIAL_STAFF_REQUESTS: StaffWorkflowRequest[] = [
  {
    id: "REQ-1042",
    employeeId: "MOD007",
    employeeName: "Debrupa Ghosh",
    employeeEmail: "ghoshdebrupa005@gmail.com",
    department: "Engineering",
    designation: "Full Stack Engineer",
    type: "EQUIPMENT",
    title: "Ergonomic Monitor & USB-C Thunderbolt 4 Dock",
    description: "Requisition for dual 27-inch 4K Dell UltraSharp monitors and CalDigit TS4 dock for frontend & backend microservices development, testing high-DPI responsive builds.",
    amountOrDays: "Rs. 1,150.00",
    targetDates: "Immediate Requisition",
    priority: "MEDIUM",
    status: "PENDING",
    submittedAt: "2026-10-02T06:10:00.000Z",
    isVerifiedStaff: true,
    justification: "Approved under Tech Stack Hardware Allowance policy Sec 4.2 for verified engineering staff.",
    supervisorName: "Alex Morgan (HR Admin)"
  },
  {
    id: "REQ-1043",
    employeeId: "MOD005",
    employeeName: "Sourav Ganguly",
    employeeEmail: "sourav.ganguly@modela.io",
    department: "Engineering",
    designation: "Senior BIM Engineer",
    type: "EXPENSE",
    title: "Autodesk BIM 360 & Navisworks Professional Certification",
    description: "Reimbursement claim for Autodesk Certified Professional exam fee and advanced cloud BIM integration workshop.",
    amountOrDays: "Rs. 680.00",
    targetDates: "2026-09-28",
    priority: "NORMAL" as any,
    status: "APPROVED",
    submittedAt: "2026-09-29T10:30:00.000Z",
    reviewedAt: "2026-09-30T14:20:00.000Z",
    reviewedBy: "Sushoovan Das",
    remarks: "Approved under professional development annual budget.",
    isVerifiedStaff: true,
    justification: "Required for Tier-1 enterprise structural BIM validation on upcoming client deliverables."
  },
  {
    id: "REQ-1044",
    employeeId: "MOD006",
    employeeName: "Pooja Sharma",
    employeeEmail: "pooja.sharma@modela.io",
    department: "Design",
    designation: "MEP Designer",
    type: "SHIFT",
    title: "Remote Work & Core Hours Flex Adjustment",
    description: "Requesting core operating hours adjustment to 07:00 AM - 03:30 PM PST with 2 remote workdays weekly (Tuesdays & Thursdays) to align with European architectural partners.",
    amountOrDays: "Ongoing Q4 Schedule",
    targetDates: "2026-10-01 to 2026-12-31",
    priority: "LOW",
    status: "APPROVED",
    submittedAt: "2026-09-27T08:45:00.000Z",
    reviewedAt: "2026-09-28T09:15:00.000Z",
    reviewedBy: "Marcus Vance",
    remarks: "Approved with bi-weekly check-in schedule.",
    isVerifiedStaff: true,
    justification: "Enhanced collaboration with overseas structural teams."
  }
];

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
    id: "PAY-2026-09-04",
    employeeId: "MOD007",
    employeeName: "Debrupa Ghosh",
    month: "September",
    year: 2026,
    basicSalary: 50000,
    allowances: 14000,
    deductions: 3700,
    grossSalary: 64000,
    netSalary: 60300,
    status: "PAID",
    paymentDate: "2026-09-30",
    disbursedBy: "System Master Disburser",
    lopDays: 0,
    lopAmount: 0,
    allowanceBreakdown: {
      hra: 6000,
      medical: 2000,
      special: 4500,
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
    id: "PAY-2026-10-04",
    employeeId: "MOD007",
    employeeName: "Debrupa Ghosh",
    month: "October",
    year: 2026,
    basicSalary: 50000,
    allowances: 14000,
    deductions: 3700,
    grossSalary: 64000,
    netSalary: 60300,
    status: "PAID",
    paymentDate: "2026-10-15",
    disbursedBy: "System Master Disburser",
    lopDays: 0,
    lopAmount: 0,
    allowanceBreakdown: {
      hra: 6000,
      medical: 2000,
      special: 4500,
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
