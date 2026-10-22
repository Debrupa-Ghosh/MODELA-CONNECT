import express, { Request, Response } from 'express';
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
}

const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// In-memory persistent database for server session
let users: ServerUser[] = [
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
    id: "USR-SUSHOOVAN-GMAIL",
    uid: "USR-SUSHOOVAN-GMAIL",
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
  }
];

let employees = [
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
    compensation: { basic: 95000, allowances: 30000 }
  },
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
    compensation: { basic: 48000, allowances: 14000 }
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
    compensation: { basic: 50000, allowances: 14000 }
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
    location: "San Francisco HQ",
    compensation: { basic: 45000, allowances: 12000 }
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
    compensation: { basic: 42000, allowances: 11000 }
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

let staffRequests: ServerStaffRequest[] = [
  {
    id: "REQ-STF-002",
    employeeId: "MOD007",
    employeeName: "Debrupa Ghosh",
    employeeEmail: "ghoshdebrupa005@gmail.com",
    department: "Engineering",
    designation: "Full Stack Engineer",
    type: "EQUIPMENT",
    title: "Workstation GPU & Ultra-Wide Monitor Hardware Requisition",
    amountOrDays: "Rs. 2,850.00",
    targetDates: "Immediate Requisition",
    priority: "URGENT",
    status: "PENDING",
    description: "Requisitioning high-memory workstation upgrade for local machine learning model development and 4K multi-display docking hub.",
    submittedAt: "2026-10-02T06:39:15.000Z",
    supervisorName: "CTO / Super Admin"
  },
  {
    id: "REQ-STF-003",
    employeeId: "MOD003",
    employeeName: "Marcus Vance",
    employeeEmail: "marcus.vance@modela.io",
    department: "Human Resources",
    designation: "HR Operations Manager",
    type: "EXPENSE",
    title: "Quarterly Recruitment Portal Subscription & Assessment Tokens",
    amountOrDays: "Rs. 1,450.00",
    targetDates: "FY26 Q4 Cycle",
    priority: "MEDIUM",
    status: "APPROVED",
    description: "Annual renewal for technical candidate assessment pipeline licenses.",
    submittedAt: "2026-09-28T14:15:00.000Z",
    reviewedAt: "2026-09-29T10:00:00.000Z",
    reviewedBy: "Alex Morgan"
  },
  {
    id: "REQ-STF-004",
    employeeId: "MOD005",
    employeeName: "Sourav Ganguly",
    employeeEmail: "sourav.ganguly@modela.io",
    department: "Engineering",
    designation: "Senior BIM Engineer",
    type: "SHIFT",
    title: "Core Shift Adjustment for European Client Support",
    amountOrDays: "Temporary 3-Week Rotation",
    targetDates: "Oct 20 - Nov 10, 2026",
    priority: "MEDIUM",
    status: "PENDING",
    description: "Requesting schedule shift from 09:00-18:00 to 12:00-21:00 for direct coordination with London deployment team.",
    submittedAt: "2026-10-01T16:45:00.000Z",
    supervisorName: "Engineering Director"
  }
];

// API Endpoints
app.get('/api/users', (req: Request, res: Response) => {
  res.json({
    success: true,
    users,
    requests: users.filter(u => u.status === 'PENDING')
  });
});

app.post('/api/users/request', (req: Request, res: Response) => {
  const newUser = req.body;
  if (!newUser || !newUser.email) {
    return res.status(400).json({ success: false, message: 'Invalid payload' });
  }
  const existing = users.find(u => u.email.toLowerCase() === newUser.email.toLowerCase());
  if (existing) {
    return res.status(400).json({ success: false, message: 'User already exists' });
  }
  users.unshift(newUser);
  res.json({ success: true, user: newUser });
});

app.post('/api/users/approve', (req: Request, res: Response) => {
  const { userId, role, reviewer, remarks } = req.body;
  users = users.map(u => {
    if (u.id === userId || u.uid === userId) {
      return {
        ...u,
        status: 'APPROVED',
        role: role || 'EMPLOYEE',
        reviewedAt: new Date().toISOString(),
        reviewedBy: reviewer || 'Super Admin',
        remarks: remarks || `Approved with role ${role}`
      };
    }
    return u;
  });
  res.json({ success: true });
});

app.post('/api/users/reject', (req: Request, res: Response) => {
  const { userId, reviewer, reason } = req.body;
  users = users.map(u => {
    if (u.id === userId || u.uid === userId) {
      return {
        ...u,
        status: 'REJECTED',
        reviewedAt: new Date().toISOString(),
        reviewedBy: reviewer || 'Super Admin',
        remarks: reason || 'Rejected'
      };
    }
    return u;
  });
  res.json({ success: true });
});

app.post('/api/users/role', (req: Request, res: Response) => {
  const { userId, newRole } = req.body;
  users = users.map(u => (u.id === userId || u.uid === userId ? { ...u, role: newRole } : u));
  res.json({ success: true });
});

app.delete('/api/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  users = users.filter(u => u.id !== id && u.uid !== id && u.email?.toLowerCase() !== id.toLowerCase());
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
        remarks: remarks || (r as any).remarks,
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

// Server-Sent Events stream for live sync
app.get('/api/users/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendUpdate = () => {
    res.write(`data: ${JSON.stringify({ users })}\n\n`);
  };

  sendUpdate();
  const interval = setInterval(sendUpdate, 15000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// Vite Middleware Integration
async function startServer() {
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
