import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
interface ServerUser {
  id: string;
  uid: string;
  name: string;
  email: string;
  avatar_url: string;
  status: string;
  role: string | null;
  employeeId?: string;
  designation?: string;
  department?: string;
  requestedAt?: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  notificationUnread?: boolean;
  remarks?: string;
  updatedAt?: string;
  isLiveRequest?: boolean;
}

const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));

const STATE_FILE_PATH = path.resolve(__dirname, '.server-users-state.json');

// Default baseline users
const DEFAULT_SERVER_USERS: ServerUser[] = [
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
  },
  {
    id: "USR-SATYAJIT-115",
    uid: "USR-SATYAJIT-115",
    name: "Satyajit Mazumder",
    email: "jit@modelatech.com",
    avatar_url: "https://ui-avatars.com/api/?name=Satyajit+Mazumder&background=0284c7&color=fff",
    status: "APPROVED",
    role: "EMPLOYEE",
    employeeId: "MOD115",
    designation: "Staff Candidate",
    department: "General Staff",
    requestedAt: "2026-11-02T08:00:00.000Z",
    reviewedAt: "2026-11-02T08:05:00.000Z",
    reviewedBy: "System Root"
  }
];

const PERMANENTLY_DELETED_REQUEST_KEYS = new Set([
  'debrupa123@gmail.com',
  'usr-pending-debrupa',
  'deb@gmail.com',
  'usr-qyg6aplc',
  'vikram.sengupta@gmail.com',
  'usr-pending-03'
]);

const PROTECTED_ACTIVE_KEYS = new Set([
  'aditichakraborty2005@gmail.com',
  'aditichakrabarty2005@gmail.com',
  'usr-aditi-008',
  'mod008',
  'jit@modelatech.com',
  'usr-satyajit-115',
  'mod115'
]);

let users: ServerUser[] = [...DEFAULT_SERVER_USERS];
let serverDeletedIds = new Set<string>([
  ...PERMANENTLY_DELETED_REQUEST_KEYS,
  'req-1572',
  'req-3779',
  'req-9074',
  'req-2709',
  'req-6425'
]);
let persistedEmployees: any[] = [];
let persistedPayroll: any[] = [];
let persistedRequests: any[] = [];
let persistedPolicies: any[] = [];

const isExcludedServerStaffRequest = (r: any): boolean => {
  if (!r) return true;
  const reqId = String(r.id || '').trim().toUpperCase();
  const empId = String(r.employeeId || '').trim().toUpperCase();
  const empName = String(r.employeeName || '').trim().toLowerCase();
  const reqTitle = String(r.title || '').trim().toLowerCase();
  if (
    reqId === 'REQ-1572' ||
    reqId === 'REQ-2709' ||
    reqId === 'REQ-6425' ||
    reqId === 'REQ-3779' ||
    reqId === 'REQ-9074' ||
    empId === 'MOD116' ||
    ((empId === 'MOD106' || empName === 'modela tech') && (reqTitle === 'bhaifota' || reqTitle === 'laptop')) ||
    ((empId === 'MOD011' || empName === 'debrupa ghosh') && (reqTitle === 'laptop needed' || reqTitle === 'device needed' || reqTitle === 'sick leave'))
  ) {
    return true;
  }
  return false;
};

try {
  if (fs.existsSync(STATE_FILE_PATH)) {
    const raw = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.users) && parsed.users.length > 0) {
      users = parsed.users.filter(
        (u: ServerUser) =>
          u &&
          !PERMANENTLY_DELETED_REQUEST_KEYS.has(String(u.email || '').toLowerCase().trim()) &&
          !PERMANENTLY_DELETED_REQUEST_KEYS.has(String(u.id || '').toLowerCase().trim())
      );
      DEFAULT_SERVER_USERS.forEach(defU => {
        if (!users.some(u => u.email.toLowerCase().trim() === defU.email.toLowerCase().trim())) {
          users.push(defU);
        }
      });
    }
    if (Array.isArray(parsed.deletedIds)) {
      parsed.deletedIds.forEach((id: string) => {
        const clean = String(id).toLowerCase().trim();
        if (!PROTECTED_ACTIVE_KEYS.has(clean)) {
          serverDeletedIds.add(clean);
        }
      });
    }
    if (Array.isArray(parsed.employees)) {
      persistedEmployees = parsed.employees;
    }
    if (Array.isArray(parsed.payroll)) {
      persistedPayroll = parsed.payroll;
    }
    if (Array.isArray(parsed.staffRequests)) {
      persistedRequests = parsed.staffRequests.filter((r: any) => !isExcludedServerStaffRequest(r));
    }
  }
} catch {}

let employees = [
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
    compensation: { basic: 85000, allowances: 25000 }
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
    compensation: { basic: 50000, allowances: 15000 }
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
    compensation: { basic: 50000, allowances: 15000 }
  },
  {
    id: "MOD115",
    firstName: "Satyajit",
    lastName: "Mazumder",
    email: "jit@modelatech.com",
    joiningDate: "2026-11-02",
    designation: "Staff Candidate",
    phone: "",
    department: "General Staff",
    status: "ACTIVE",
    location: "San Francisco HQ",
    compensation: { basic: 50000, allowances: 15000 }
  }
];

let auditLogs = [
  {
    id: "LOG-INIT-001",
    timestamp: "2026-10-02T06:38:58.366Z",
    action: "Super Admin Sign In",
    targetUser: "sushoovandas@gmail.com",
    executedBy: "sushoovandas@gmail.com",
    details: "Authorized Super Admin logged into Architect Terminal: Sushoovan Das",
    module: "Auth",
    result: "SUCCESS"
  },
  {
    id: "LOG-INIT-002",
    timestamp: "2026-10-02T06:37:42.653Z",
    action: "User Approved & Role Assigned",
    targetUser: "ghoshdebrupa005@gmail.com",
    executedBy: "modelatech2026@gmail.com",
    details: "Verified staff access granted with role EMPLOYEE to Debrupa Ghosh",
    module: "User Management",
    result: "SUCCESS"
  }
];

interface ServerStaffRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  designation: string;
  type: string;
  title: string;
  amountOrDays: string;
  targetDates?: string;
  priority: string;
  status: string;
  description: string;
  submittedAt: string;
  supervisorName?: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  remarks?: string;
}

let staffRequests: ServerStaffRequest[] = [...persistedRequests];
let payrollRecords: any[] = [...persistedPayroll];
let policyRecords: any[] = [...persistedPolicies];

if (persistedEmployees.length > 0) {
  persistedEmployees.forEach(pe => {
    if (!pe || !pe.id) return;
    const idx = employees.findIndex(
      e => e.id.toUpperCase() === String(pe.id).toUpperCase() || (pe.email && e.email?.toLowerCase() === String(pe.email).toLowerCase())
    );
    if (idx >= 0) {
      employees[idx] = { ...employees[idx], ...pe };
    } else {
      employees.push(pe);
    }
  });
}

let saveStateTimer: ReturnType<typeof setTimeout> | null = null;

const saveServerState = () => {
  if (saveStateTimer) clearTimeout(saveStateTimer);
  saveStateTimer = setTimeout(() => {
    saveStateTimer = null;
    try {
      const payload = JSON.stringify({
        users,
        deletedIds: Array.from(serverDeletedIds),
        employees,
        payroll: payrollRecords,
        staffRequests: staffRequests.filter(r => !isExcludedServerStaffRequest(r)),
        policies: policyRecords
      });
      fs.promises.writeFile(STATE_FILE_PATH, payload, 'utf-8').catch(() => {});
    } catch {}
  }, 200);
};

saveServerState();

const sseClients = new Set<Response>();

const broadcastUsers = () => {
  const payload = `data: ${JSON.stringify({ users, deletedIds: Array.from(serverDeletedIds) })}\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  });
};

// API Endpoints
app.get('/api/users', (req: Request, res: Response) => {
  users = users.filter(
    u =>
      u &&
      u.status !== 'REJECTED' &&
      !serverDeletedIds.has(String(u.id || '').toLowerCase().trim()) &&
      !serverDeletedIds.has(String(u.email || '').toLowerCase().trim())
  );
  res.json({
    success: true,
    users,
    deletedIds: Array.from(serverDeletedIds),
    requests: users.filter(u => u.status === 'PENDING')
  });
});

app.post('/api/users/request', (req: Request, res: Response) => {
  const newUser = req.body;
  if (!newUser || !newUser.email) {
    return res.status(400).json({ success: false, message: 'Invalid payload' });
  }
  const emailLower = newUser.email.toLowerCase().trim();
  if (['sushovand@modelatech.com'].includes(emailLower)) {
    const sa = users.find(u => u.email.toLowerCase() === emailLower);
    return res.json({ success: true, user: sa || newUser, message: 'Super Admin active' });
  }
  const now = new Date().toISOString();
  const existing = users.find(u => u.email.toLowerCase().trim() === emailLower);
  const record: ServerUser = {
    ...(existing || {}),
    ...newUser,
    id: newUser.id || existing?.id || `USR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    uid: newUser.uid || newUser.id || existing?.uid || existing?.id,
    email: emailLower,
    name: (newUser.name || existing?.name || emailLower).trim(),
    status: 'PENDING',
    role: null,
    requestedAt: newUser.requestedAt || now,
    updatedAt: now,
    notificationUnread: true,
    isLiveRequest: true
  };

  serverDeletedIds.delete(emailLower);
  serverDeletedIds.delete(`req-${emailLower.replace(/[^a-z0-9]/g, '_')}`);
  if (record.id) serverDeletedIds.delete(record.id.toLowerCase());
  if (record.uid) serverDeletedIds.delete(record.uid.toLowerCase());
  if (record.employeeId) serverDeletedIds.delete(record.employeeId.toLowerCase());

  users = [
    record,
    ...users.filter(u => u.email.toLowerCase().trim() !== emailLower && u.id !== record.id)
  ];
  saveServerState();
  broadcastUsers();
  res.json({ success: true, user: record });
});

app.post('/api/users/approve', (req: Request, res: Response) => {
  const { userId, email, role, reviewer, remarks, employeeId, user } = req.body;
  const now = new Date().toISOString();
  const cleanEmail = email ? String(email).toLowerCase().trim() : '';

  if (cleanEmail) {
    serverDeletedIds.delete(cleanEmail);
    serverDeletedIds.delete(`req-${cleanEmail.replace(/[^a-z0-9]/g, '_')}`);
  }
  if (userId) serverDeletedIds.delete(String(userId).toLowerCase());
  if (employeeId) serverDeletedIds.delete(String(employeeId).toLowerCase());

  let matched = false;
  users = users.map(u => {
    const isMatch =
      u.id === userId ||
      u.uid === userId ||
      (cleanEmail && u.email?.toLowerCase().trim() === cleanEmail);

    if (isMatch) {
      matched = true;
      return {
        ...u,
        ...(user || {}),
        status: 'APPROVED',
        role: role || 'EMPLOYEE',
        employeeId: employeeId || u.employeeId,
        reviewedAt: now,
        reviewedBy: reviewer || 'Super Admin',
        remarks: remarks || `Approved with role ${role || 'EMPLOYEE'}`,
        updatedAt: now,
        isLiveRequest: true
      };
    }
    return u;
  });

  if (!matched && (cleanEmail || user)) {
    const fallbackUser: ServerUser = {
      id: userId || user?.id || `USR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      uid: userId || user?.uid || user?.id,
      name: user?.name || cleanEmail,
      email: cleanEmail || user?.email,
      avatar_url: user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || cleanEmail)}&background=0284c7&color=fff`,
      status: 'APPROVED',
      role: role || 'EMPLOYEE',
      employeeId: employeeId || user?.employeeId,
      department: user?.department || 'General Staff',
      designation: user?.designation || 'Staff Associate',
      reviewedAt: now,
      reviewedBy: reviewer || 'Super Admin',
      remarks: remarks || `Approved with role ${role || 'EMPLOYEE'}`,
      updatedAt: now,
      isLiveRequest: true
    };
    users.unshift(fallbackUser);
  }

  saveServerState();
  broadcastUsers();
  res.json({ success: true });
});

app.post('/api/users/reject', (req: Request, res: Response) => {
  const { userId, targetId, email } = req.body;
  const cleanId = userId ? String(userId).toLowerCase().trim() : '';
  const cleanTargetId = targetId ? String(targetId).toLowerCase().trim() : '';
  const cleanEmail = email ? String(email).toLowerCase().trim() : '';

  if (cleanId && !PROTECTED_ACTIVE_KEYS.has(cleanId)) serverDeletedIds.add(cleanId);
  if (cleanTargetId && !PROTECTED_ACTIVE_KEYS.has(cleanTargetId)) serverDeletedIds.add(cleanTargetId);
  if (cleanEmail && !PROTECTED_ACTIVE_KEYS.has(cleanEmail)) {
    serverDeletedIds.add(cleanEmail);
    serverDeletedIds.add(`req-${cleanEmail.replace(/[^a-z0-9]/g, '_')}`);
  }

  users.forEach(u => {
    const uId = String(u.id || '').toLowerCase().trim();
    const uUid = String(u.uid || '').toLowerCase().trim();
    const uEmail = String(u.email || '').toLowerCase().trim();
    if (
      (cleanId && (uId === cleanId || uUid === cleanId)) ||
      (cleanTargetId && (uId === cleanTargetId || uUid === cleanTargetId)) ||
      (cleanEmail && uEmail === cleanEmail)
    ) {
      if (uId && !PROTECTED_ACTIVE_KEYS.has(uId)) serverDeletedIds.add(uId);
      if (uUid && !PROTECTED_ACTIVE_KEYS.has(uUid)) serverDeletedIds.add(uUid);
      if (uEmail && !PROTECTED_ACTIVE_KEYS.has(uEmail)) {
        serverDeletedIds.add(uEmail);
        serverDeletedIds.add(`req-${uEmail.replace(/[^a-z0-9]/g, '_')}`);
      }
    }
  });

  users = users.filter(u => {
    const uId = String(u.id || '').toLowerCase().trim();
    const uUid = String(u.uid || '').toLowerCase().trim();
    const uEmail = String(u.email || '').toLowerCase().trim();
    if (cleanId && (uId === cleanId || uUid === cleanId)) return false;
    if (cleanTargetId && (uId === cleanTargetId || uUid === cleanTargetId)) return false;
    if (cleanEmail && uEmail === cleanEmail) return false;
    return true;
  });

  saveServerState();
  broadcastUsers();
  res.json({ success: true });
});

app.post('/api/users/role', (req: Request, res: Response) => {
  const { userId, email, newRole } = req.body;
  const now = new Date().toISOString();
  const cleanEmail = email ? String(email).toLowerCase().trim() : '';
  users = users.map(u =>
    u.id === userId || u.uid === userId || (cleanEmail && u.email?.toLowerCase().trim() === cleanEmail)
      ? { ...u, role: newRole, updatedAt: now }
      : u
  );
  saveServerState();
  broadcastUsers();
  res.json({ success: true });
});

app.delete('/api/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const cleanId = id.toLowerCase().trim();
  serverDeletedIds.add(cleanId);
  users.forEach(u => {
    if (
      u.id.toLowerCase() === cleanId ||
      u.uid?.toLowerCase() === cleanId ||
      u.email?.toLowerCase() === cleanId ||
      u.employeeId?.toLowerCase() === cleanId
    ) {
      serverDeletedIds.add(u.id.toLowerCase());
      if (u.email) serverDeletedIds.add(u.email.toLowerCase());
      if (u.employeeId) serverDeletedIds.add(u.employeeId.toLowerCase());
    }
  });
  users = users.filter(
    u =>
      u.id.toLowerCase() !== cleanId &&
      u.uid?.toLowerCase() !== cleanId &&
      u.email?.toLowerCase() !== cleanId &&
      u.employeeId?.toLowerCase() !== cleanId
  );
  saveServerState();
  broadcastUsers();
  res.json({ success: true, message: `User ${id} deleted` });
});

app.get('/api/employees', (req: Request, res: Response) => {
  res.json({ success: true, employees });
});

app.post('/api/employees', (req: Request, res: Response) => {
  const newEmp = req.body;
  if (!newEmp || !newEmp.id) {
    return res.status(400).json({ success: false, message: 'Invalid employee payload' });
  }
  const idx = employees.findIndex(
    e =>
      e.id.toUpperCase() === String(newEmp.id).toUpperCase() ||
      (newEmp.email && e.email?.toLowerCase() === String(newEmp.email).toLowerCase())
  );
  if (idx >= 0) {
    employees[idx] = { ...employees[idx], ...newEmp };
  } else {
    employees.unshift(newEmp);
  }
  saveServerState();
  res.json({ success: true, employee: newEmp });
});

app.post('/api/employees/update-id', (req: Request, res: Response) => {
  const { oldId, newId, employee, email } = req.body;
  if (!newId) {
    return res.status(400).json({ success: false, message: 'Invalid payload' });
  }
  const cleanEmail = email ? email.toLowerCase().trim() : (employee?.email ? employee.email.toLowerCase().trim() : '');
  employees = employees.map(e =>
    (e.id === oldId || (cleanEmail && e.email?.toLowerCase() === cleanEmail))
      ? { ...(employee || e), id: newId }
      : e
  );
  users = users.map(u =>
    (u.employeeId === oldId || (cleanEmail && u.email?.toLowerCase() === cleanEmail))
      ? { ...u, employeeId: newId }
      : u
  );
  saveServerState();
  res.json({ success: true });
});

app.delete('/api/employees/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  employees = employees.filter(e => e.id !== id);
  saveServerState();
  res.json({ success: true, message: `Employee ${id} deleted` });
});

app.get('/api/payroll', (_req: Request, res: Response) => {
  res.json({ success: true, payroll: payrollRecords });
});

app.post('/api/payroll', (req: Request, res: Response) => {
  const rec = req.body;
  if (!rec || !rec.id) {
    return res.status(400).json({ success: false, message: 'Invalid payroll record' });
  }
  const idx = payrollRecords.findIndex(p => p.id === rec.id);
  if (idx >= 0) {
    payrollRecords[idx] = { ...payrollRecords[idx], ...rec };
  } else {
    payrollRecords.unshift(rec);
  }
  saveServerState();
  res.json({ success: true, record: rec });
});

app.get('/api/audit-logs', (req: Request, res: Response) => {
  res.json({ success: true, logs: auditLogs });
});

// Staff workflow requests endpoints
app.get('/api/requests', (req: Request, res: Response) => {
  staffRequests = staffRequests.filter(r => !isExcludedServerStaffRequest(r));
  res.json({ success: true, requests: staffRequests });
});

app.post('/api/requests', (req: Request, res: Response) => {
  const newReq = req.body;
  if (!newReq || !newReq.title) {
    return res.status(400).json({ success: false, message: 'Invalid request' });
  }
  if (isExcludedServerStaffRequest(newReq)) {
    return res.json({ success: true, request: newReq });
  }
  staffRequests = [newReq, ...staffRequests.filter(r => r.id !== newReq.id && !isExcludedServerStaffRequest(r))];
  saveServerState();
  res.json({ success: true, request: newReq });
});

app.post('/api/requests/status', (req: Request, res: Response) => {
  const { id, status, remarks, reviewer } = req.body;
  staffRequests = staffRequests
    .filter(r => !isExcludedServerStaffRequest(r))
    .map(r => {
      if (r.id === id) {
        return {
          ...r,
          status,
          remarks: remarks || r.remarks,
          reviewedAt: new Date().toISOString(),
          reviewedBy: reviewer || 'Super Admin'
        };
      }
      return r;
    });
  saveServerState();
  res.json({ success: true });
});

app.delete('/api/requests/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  staffRequests = staffRequests.filter(r => r.id !== id && !isExcludedServerStaffRequest(r));
  saveServerState();
  res.json({ success: true, message: `Request ${id} deleted` });
});

// Helper to get Firestore instance on server
async function getServerFirestore() {
  const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) return null;
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const { initializeApp, getApps } = await import('firebase/app');
  const { getFirestore, doc, setDoc, deleteDoc } = await import('firebase/firestore');
  const fbApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  const db = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);
  return { db, doc, setDoc, deleteDoc };
}

// Policy endpoints
app.get('/api/policies', (_req: Request, res: Response) => {
  res.json({ success: true, policies: policyRecords });
});

app.post('/api/policies', async (req: Request, res: Response) => {
  const policy = req.body;
  if (!policy || !policy.policyId || !policy.policyName || !policy.fileName) {
    return res.status(400).json({ success: false, message: 'Invalid policy payload' });
  }
  const cleanId = String(policy.id || policy.policyId)
    .trim()
    .replace(/[\/\\.#$\[\]]/g, '_')
    .slice(0, 100);
  const record = {
    ...policy,
    id: cleanId,
    policyId: String(policy.policyId).trim(),
    policyName: String(policy.policyName).trim(),
    fileName: String(policy.fileName).trim(),
    createdAt: policy.createdAt || new Date().toISOString()
  };
  const idx = policyRecords.findIndex(
    p =>
      String(p.id).toLowerCase() === cleanId.toLowerCase() ||
      String(p.policyId).toLowerCase() === record.policyId.toLowerCase()
  );
  if (idx >= 0) {
    policyRecords[idx] = { ...policyRecords[idx], ...record };
  } else {
    policyRecords.unshift(record);
  }
  saveServerState();

  try {
    const fb = await getServerFirestore();
    if (fb) {
      const safeDocxHtml = record.docxHtml && String(record.docxHtml).length < 300000 ? String(record.docxHtml) : '';
      const fsPayload: Record<string, string> = {
        id: cleanId,
        policyId: record.policyId,
        policyName: record.policyName,
        fileName: record.fileName,
        fileType: String(record.fileType || 'application/pdf'),
        pdfData: record.pdfData && String(record.pdfData).length < 300000 ? String(record.pdfData) : '',
        docxHtml: safeDocxHtml,
        createdAt: record.createdAt
      };
      if (record.fileData && (safeDocxHtml.length + String(record.fileData).length) < 650000) {
        fsPayload.fileData = String(record.fileData);
      }
      await Promise.race([
        fb.setDoc(fb.doc(fb.db, 'policies', cleanId), fsPayload, { merge: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]);
    }
  } catch {}

  res.json({ success: true, policy: record });
});

app.delete('/api/policies/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const rawDecoded = decodeURIComponent(id).trim();
  const cleanId = rawDecoded.toLowerCase();
  const docId = rawDecoded.replace(/[\/\\.#$\[\]]/g, '_').slice(0, 100);
  policyRecords = policyRecords.filter(
    p =>
      String(p.id || '').trim().toLowerCase() !== cleanId &&
      String(p.policyId || '').trim().toLowerCase() !== cleanId &&
      String(p.policyName || '').trim().toLowerCase() !== cleanId
  );
  saveServerState();

  try {
    const fb = await getServerFirestore();
    if (fb && docId) {
      await Promise.race([
        fb.deleteDoc(fb.doc(fb.db, 'policies', docId)),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]);
    }
  } catch {}

  res.json({ success: true, message: `Policy ${id} deleted` });
});

// Server-Sent Events endpoint (closes cleanly to avoid holding Cloud Run proxy slots)
app.get('/api/users/stream', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.write(`data: ${JSON.stringify({ users, deletedIds: Array.from(serverDeletedIds) })}\n\n`);
  res.end();
});

// Server-side Firestore reconciliation to guarantee database state
async function reconcileFirestoreDatabase() {
  try {
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) return;
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const { initializeApp, getApps } = await import('firebase/app');
    const { getFirestore, doc, setDoc, deleteDoc, collection, getDocs, getDoc } = await import('firebase/firestore');

    const fbApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    const db = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);

    const withWriteTimeout = <T>(p: Promise<T>, ms = 6000): Promise<T> =>
      Promise.race([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Write timeout (quota backoff)')), ms))
      ]);

    let needsRetry = false;

    // 1. Ensure MOD008 (aditichakraborty2005@gmail.com) is present in Firestore employees collection
    const mod008Ref = doc(db, 'employees', 'MOD008');
    const mod008Snap = await getDoc(mod008Ref);
    if (!mod008Snap.exists()) {
      try {
        await withWriteTimeout(
          setDoc(
            mod008Ref,
            {
              id: 'MOD008',
              firstName: 'Aditi',
              lastName: 'Chakraborty',
              email: 'aditichakraborty2005@gmail.com',
              joiningDate: '2026-10-29',
              designation: 'Staff Candidate',
              phone: '',
              department: 'General Staff',
              status: 'ACTIVE',
              location: 'San Francisco HQ',
              compensation: { basic: 50000, allowances: 15000 },
              avatar: 'https://ui-avatars.com/api/?name=Aditi%20Chakraborty&background=0284c7&color=fff'
            },
            { merge: true }
          )
        );
      } catch {
        needsRetry = true;
      }
    }

    // 2. Delete all Modela Tech, MOD106 records from Firestore payroll collection ONLY
    const payrollSnap = await getDocs(collection(db, 'payroll'));
    for (const d of payrollSnap.docs) {
      const data = d.data();
      const docIdUpper = d.id.toUpperCase();
      const empIdUpper = String(data.employeeId || '').trim().toUpperCase();
      const empNameLower = String(data.employeeName || '').trim().toLowerCase();
      if (
        docIdUpper.includes('MOD106') ||
        empIdUpper === 'MOD106' ||
        empNameLower === 'modela tech' ||
        empNameLower.includes('modela tech')
      ) {
        try {
          await withWriteTimeout(deleteDoc(doc(db, 'payroll', d.id)));
        } catch {
          needsRetry = true;
          break;
        }
      }
    }

    // 3. Delete REQ-1572, REQ-3779, REQ-9074, REQ-2709, and REQ-6425 from Firestore requests collection
    try {
      await withWriteTimeout(deleteDoc(doc(db, 'requests', 'REQ-1572')));
      await withWriteTimeout(deleteDoc(doc(db, 'requests', 'REQ-3779')));
      await withWriteTimeout(deleteDoc(doc(db, 'requests', 'REQ-9074')));
      await withWriteTimeout(deleteDoc(doc(db, 'requests', 'REQ-2709')));
      await withWriteTimeout(deleteDoc(doc(db, 'requests', 'REQ-6425')));
      const reqSnap = await getDocs(collection(db, 'requests'));
      for (const rDoc of reqSnap.docs) {
        const rData = rDoc.data();
        if (isExcludedServerStaffRequest({ ...rData, id: rData.id || rDoc.id })) {
          await withWriteTimeout(deleteDoc(doc(db, 'requests', rDoc.id)));
        }
      }
    } catch {
      needsRetry = true;
    }

    // 4. Sync any updated payroll records (such as OT amounts) to Firestore payroll collection
    for (const pRec of payrollRecords) {
      if (!pRec || !pRec.id) continue;
      try {
        await withWriteTimeout(setDoc(doc(db, 'payroll', pRec.id), pRec, { merge: true }));
      } catch {
        needsRetry = true;
        break;
      }
    }

    // 5. Sync any updated employee records (such as Sick/Privilege/Maternity/Paternity Leave) to Firestore employees collection
    for (const empRec of employees) {
      if (!empRec || !empRec.id || !(empRec as any).updatedAt) continue;
      try {
        await withWriteTimeout(setDoc(doc(db, 'employees', empRec.id), empRec, { merge: true }));
      } catch {
        needsRetry = true;
        break;
      }
    }

    // 6. Sync policies collection strictly from Firestore so only policies present in database exist in server state
    try {
      const policiesSnap = await getDocs(collection(db, 'policies'));
      const firestorePolicies: any[] = [];
      for (const pDoc of policiesSnap.docs) {
        const pData = pDoc.data();
        if (pData && pData.policyId && pData.policyName && pData.fileName) {
          const cleanId = String(pData.id || pDoc.id).trim();
          const existing = policyRecords.find(
            p =>
              String(p.id || '').toLowerCase() === cleanId.toLowerCase() ||
              String(p.policyId || '').toLowerCase() === String(pData.policyId).toLowerCase()
          );
          firestorePolicies.push({
            ...(existing || {}),
            ...pData,
            id: cleanId,
            fileData: pData.fileData || existing?.fileData || '',
            docxHtml: pData.docxHtml || existing?.docxHtml || ''
          });
        }
      }
      policyRecords = firestorePolicies;
      saveServerState();
    } catch {
      needsRetry = true;
    }

    if (needsRetry) {
      setTimeout(reconcileFirestoreDatabase, 5 * 60 * 1000);
    } else {
      console.log('Firestore reconciliation complete.');
    }
  } catch (err) {
    setTimeout(reconcileFirestoreDatabase, 5 * 60 * 1000);
  }
}

// Vite Middleware Integration
async function startServer() {
  reconcileFirestoreDatabase();
  const distPath = path.resolve(__dirname, 'dist');
  const distIndexPath = path.resolve(distPath, 'index.html');

  if (process.env.NODE_ENV === 'production') {
    // If in production but dist directory does not exist yet (e.g. build step was skipped on Render), build it automatically
    if (!fs.existsSync(distIndexPath)) {
      console.log('Production build not found at dist/index.html. Running Vite build...');
      try {
        const { build } = await import('vite');
        await build();
        console.log('Production build completed successfully.');
      } catch (err) {
        console.error('Automated Vite build encountered an error:', err);
      }
    }

    if (fs.existsSync(distIndexPath)) {
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(distIndexPath);
      });
    } else {
      console.log('Falling back to Vite server middleware in production...');
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa'
      });
      app.use(vite.middlewares);
    }
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Modela Connect server running on port ${PORT}`);
  });
}

startServer();
