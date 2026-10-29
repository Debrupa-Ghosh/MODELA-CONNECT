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

app.use(express.json());

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
  'mod008'
]);

let users: ServerUser[] = [...DEFAULT_SERVER_USERS];
let serverDeletedIds = new Set<string>(PERMANENTLY_DELETED_REQUEST_KEYS);

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
  }
} catch {}

const saveServerState = () => {
  try {
    fs.writeFileSync(
      STATE_FILE_PATH,
      JSON.stringify({ users, deletedIds: Array.from(serverDeletedIds) }, null, 2),
      'utf-8'
    );
  } catch {}
};

saveServerState();

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

let staffRequests: ServerStaffRequest[] = [];

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
  if (record.id) serverDeletedIds.delete(record.id.toLowerCase());
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

  if (cleanEmail) serverDeletedIds.delete(cleanEmail);
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
  const { userId, email, reviewer, reason } = req.body;
  const now = new Date().toISOString();
  const cleanEmail = email ? String(email).toLowerCase().trim() : '';
  users = users.map(u => {
    if (u.id === userId || u.uid === userId || (cleanEmail && u.email?.toLowerCase().trim() === cleanEmail)) {
      return {
        ...u,
        status: 'REJECTED',
        reviewedAt: now,
        reviewedBy: reviewer || 'Super Admin',
        remarks: reason || 'Rejected',
        updatedAt: now,
        isLiveRequest: false
      };
    }
    return u;
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
  employees.unshift(newEmp);
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
  res.json({ success: true });
});

app.delete('/api/employees/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  employees = employees.filter(e => e.id !== id);
  res.json({ success: true, message: `Employee ${id} deleted` });
});

app.get('/api/audit-logs', (req: Request, res: Response) => {
  res.json({ success: true, logs: auditLogs });
});

// Staff workflow requests endpoints
app.get('/api/requests', (req: Request, res: Response) => {
  res.json({ success: true, requests: staffRequests });
});

app.post('/api/requests', (req: Request, res: Response) => {
  const newReq = req.body;
  if (!newReq || !newReq.title) {
    return res.status(400).json({ success: false, message: 'Invalid request' });
  }
  staffRequests.unshift(newReq);
  res.json({ success: true, request: newReq });
});

app.post('/api/requests/status', (req: Request, res: Response) => {
  const { id, status, remarks, reviewer } = req.body;
  staffRequests = staffRequests.map(r => {
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
  res.json({ success: true });
});

app.delete('/api/requests/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  staffRequests = staffRequests.filter(r => r.id !== id);
  res.json({ success: true, message: `Request ${id} deleted` });
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

    if (needsRetry) {
      setTimeout(reconcileFirestoreDatabase, 5 * 60 * 1000);
    } else {
      console.log('Firestore reconciliation complete: MOD008 added to employees, MOD106 removed from payroll.');
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
