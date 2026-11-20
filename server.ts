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

const DEFAULT_SERVER_USERS: ServerUser[] = [
  {
    id: "USR-ADITI-008",
    uid: "USR-ADITI-008",
    name: "Aditi Chakrabarty",
    email: "aditichakraborty2005@gmail.com",
    avatar_url: "https://ui-avatars.com/api/?name=Aditi+Chakrabarty&background=0284c7&color=fff",
    status: "APPROVED",
    role: "EMPLOYEE",
    employeeId: "MTK020",
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
    employeeId: "MTK023",
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
  },
  {
    id: "USR-MTK018",
    uid: "USR-MTK018",
    name: "Abhinandan Baitalik",
    email: "abhinandanb@modelatech.com",
    avatar_url: "https://ui-avatars.com/api/?name=Abhinandan+Baitalik&background=0284c7&color=fff",
    status: "APPROVED",
    role: "EMPLOYEE",
    employeeId: "MTK018",
    designation: "Staff Candidate",
    department: "General Staff",
    requestedAt: "2026-11-04T08:00:00.000Z",
    reviewedAt: "2026-11-04T08:05:00.000Z",
    reviewedBy: "System Root"
  },
  {
    id: "USR-MTK019",
    uid: "USR-MTK019",
    name: "Batas chandra mahato",
    email: "batasm@modelatech.com",
    avatar_url: "https://ui-avatars.com/api/?name=Batas+chandra+mahato&background=0284c7&color=fff",
    status: "APPROVED",
    role: "EMPLOYEE",
    employeeId: "MTK019",
    designation: "Staff Candidate",
    department: "General Staff",
    requestedAt: "2026-11-04T08:00:00.000Z",
    reviewedAt: "2026-11-04T08:05:00.000Z",
    reviewedBy: "System Root"
  },
  {
    id: "USR-MTK016",
    uid: "USR-MTK016",
    name: "Damayanti Chanda",
    email: "damayantic@modelatech.com",
    avatar_url: "https://ui-avatars.com/api/?name=Damayanti+Chanda&background=0284c7&color=fff",
    status: "APPROVED",
    role: "HR",
    employeeId: "MTK016",
    designation: "Staff Candidate",
    department: "General Staff",
    requestedAt: "2026-11-04T08:00:00.000Z",
    reviewedAt: "2026-11-04T08:05:00.000Z",
    reviewedBy: "System Root"
  },
  {
    id: "USR-MOD106",
    uid: "USR-MOD106",
    name: "Modela Tech",
    email: "modelatech4@gmail.com",
    avatar_url: "https://ui-avatars.com/api/?name=Modela+Tech&background=3b82f6&color=fff",
    status: "APPROVED",
    role: "SUPER_ADMIN",
    employeeId: "MOD106",
    designation: "Staff Candidate",
    department: "General Staff",
    requestedAt: "2026-11-04T08:00:00.000Z",
    reviewedAt: "2026-11-04T08:05:00.000Z",
    reviewedBy: "System Root"
  },
  {
    id: "USR-MTK012",
    uid: "USR-MTK012",
    name: "Mosarof Hosen",
    email: "mosarafh@modelatech.com",
    avatar_url: "https://ui-avatars.com/api/?name=Mosarof+Hosen&background=0284c7&color=fff",
    status: "APPROVED",
    role: "EMPLOYEE",
    employeeId: "MTK012",
    designation: "Staff Candidate",
    department: "General Staff",
    requestedAt: "2026-11-04T08:00:00.000Z",
    reviewedAt: "2026-11-04T08:05:00.000Z",
    reviewedBy: "System Root"
  },
  {
    id: "USR-MTK003",
    uid: "USR-MTK003",
    name: "Pritam Saha",
    email: "pat@modelatech.com",
    avatar_url: "https://ui-avatars.com/api/?name=Pritam+Saha&background=0284c7&color=fff",
    status: "APPROVED",
    role: "DIRECTOR",
    employeeId: "MTK003",
    designation: "Staff Candidate",
    department: "General Staff",
    requestedAt: "2026-11-04T08:00:00.000Z",
    reviewedAt: "2026-11-04T08:05:00.000Z",
    reviewedBy: "System Root"
  },
  {
    id: "USR-MTK021",
    uid: "USR-MTK021",
    name: "Poulami Das",
    email: "poulamid@modelatech.com",
    avatar_url: "https://ui-avatars.com/api/?name=Poulami+Das&background=0284c7&color=fff",
    status: "APPROVED",
    role: "EMPLOYEE",
    employeeId: "MTK021",
    designation: "Staff Candidate",
    department: "General Staff",
    requestedAt: "2026-11-04T08:00:00.000Z",
    reviewedAt: "2026-11-04T08:05:00.000Z",
    reviewedBy: "System Root"
  },
  {
    id: "USR-MTK017",
    uid: "USR-MTK017",
    name: "Poulami Manna",
    email: "poulamim@modelatech.com",
    avatar_url: "https://ui-avatars.com/api/?name=Poulami+Manna&background=0284c7&color=fff",
    status: "APPROVED",
    role: "EMPLOYEE",
    employeeId: "MTK017",
    designation: "Staff Candidate",
    department: "General Staff",
    requestedAt: "2026-11-05T08:00:00.000Z",
    reviewedAt: "2026-11-05T08:05:00.000Z",
    reviewedBy: "System Root"
  },
  {
    id: "USR-MTK004",
    uid: "USR-MTK004",
    name: "Sandeepan Choudhury",
    email: "sandeepanc04@gmail.com",
    avatar_url: "https://ui-avatars.com/api/?name=Sandeepan+Choudhury&background=0284c7&color=fff",
    status: "APPROVED",
    role: "DIRECTOR",
    employeeId: "MTK004",
    designation: "Staff Candidate",
    department: "General Staff",
    requestedAt: "2026-11-04T08:00:00.000Z",
    reviewedAt: "2026-11-04T08:05:00.000Z",
    reviewedBy: "System Root"
  },
  {
    id: "USR-MTK007",
    uid: "USR-MTK007",
    name: "Shibotosh Karmakar",
    email: "shibotoshk@modelatech.com",
    avatar_url: "https://ui-avatars.com/api/?name=Shibotosh+Karmakar&background=0284c7&color=fff",
    status: "APPROVED",
    role: "EMPLOYEE",
    employeeId: "MTK007",
    designation: "Staff Candidate",
    department: "General Staff",
    requestedAt: "2026-11-04T08:00:00.000Z",
    reviewedAt: "2026-11-04T08:05:00.000Z",
    reviewedBy: "System Root"
  },
  {
    id: "USR-MTK009",
    uid: "USR-MTK009",
    name: "Shuvam Mandal",
    email: "shuvamm@modelatech.com",
    avatar_url: "https://ui-avatars.com/api/?name=Shuvam+Mandal&background=0284c7&color=fff",
    status: "APPROVED",
    role: "EMPLOYEE",
    employeeId: "MTK009",
    designation: "Staff Candidate",
    department: "General Staff",
    requestedAt: "2026-11-04T08:00:00.000Z",
    reviewedAt: "2026-11-04T08:05:00.000Z",
    reviewedBy: "System Root"
  },
  {
    id: "USR-MOD116",
    uid: "USR-MOD116",
    name: "Subhasri Mandal",
    email: "smandal@modelatechnologies.com",
    avatar_url: "https://ui-avatars.com/api/?name=Subhasri+Mandal&background=0284c7&color=fff",
    status: "APPROVED",
    role: "EMPLOYEE",
    employeeId: "MOD116",
    designation: "Staff Candidate",
    department: "General Staff",
    requestedAt: "2026-11-04T08:00:00.000Z",
    reviewedAt: "2026-11-04T08:05:00.000Z",
    reviewedBy: "System Root"
  },
  {
    id: "USR-MTK022",
    uid: "USR-MTK022",
    name: "Subhabrata Saha",
    email: "subhabratas@modelatech.com",
    avatar_url: "https://ui-avatars.com/api/?name=Subhabrata+Saha&background=0284c7&color=fff",
    status: "APPROVED",
    role: "EMPLOYEE",
    employeeId: "MTK022",
    designation: "Staff Candidate",
    department: "General Staff",
    requestedAt: "2026-11-04T08:00:00.000Z",
    reviewedAt: "2026-11-04T08:05:00.000Z",
    reviewedBy: "System Root"
  },
  {
    id: "USR-MTK024",
    uid: "USR-MTK024",
    name: "Swagata Chattopadhyay",
    email: "swagatac@modelatech.com",
    avatar_url: "https://ui-avatars.com/api/?name=Swagata+Chattopadhyay&background=0284c7&color=fff",
    status: "APPROVED",
    role: "EMPLOYEE",
    employeeId: "MTK024",
    designation: "Staff Candidate",
    department: "General Staff",
    requestedAt: "2026-11-04T08:00:00.000Z",
    reviewedAt: "2026-11-04T08:05:00.000Z",
    reviewedBy: "System Root"
  },
  {
    id: "USR-222EH297",
    uid: "USR-222EH297",
    name: "Tiasha Chakraborty",
    email: "tiasha@modelatechnologies.com",
    avatar_url: "https://ui-avatars.com/api/?name=Tiasha+Chakraborty&background=0284c7&color=fff",
    status: "APPROVED",
    role: "EMPLOYEE",
    employeeId: "MOD001",
    designation: "Staff Candidate",
    department: "General Staff",
    requestedAt: "2026-11-06T08:51:11.659Z",
    reviewedAt: "2026-11-06T08:51:42.597Z",
    reviewedBy: "modelatech4@gmail.com"
  }
];

const PERMANENTLY_DELETED_REQUEST_KEYS = new Set([
  'debrupa123@gmail.com',
  'usr-pending-debrupa',
  'deb@gmail.com',
  'usr-qyg6aplc',
  'vikram.sengupta@gmail.com',
  'usr-pending-03',
  'sushovand@modelatech.com',
  'usr-q94biiq5',
  'mtk006',
  'usr-mtk006',
  'req-sushovand_modelatech_com',
  'sushoovan das'
]);

const PROTECTED_ACTIVE_KEYS = new Set([
  'aditichakraborty2005@gmail.com',
  'aditichakrabarty2005@gmail.com',
  'usr-aditi-008',
  'mtk020',
  'surupa008@gmail.com',
  'usr-surupa-011',
  'mtk023',
  'jit@modelatech.com',
  'usr-satyajit-115',
  'mod115',
  'abhinandanb@modelatech.com',
  'usr-mtk018',
  'mtk018',
  'batasm@modelatech.com',
  'usr-mtk019',
  'mtk019',
  'damayantic@modelatech.com',
  'usr-mtk016',
  'mtk016',
  'modelatech4@gmail.com',
  'usr-mod106',
  'mod106',
  'mosarafh@modelatech.com',
  'usr-mtk012',
  'mtk012',
  'pat@modelatech.com',
  'usr-mtk003',
  'mtk003',
  'poulamid@modelatech.com',
  'usr-mtk021',
  'mtk021',
  'poulamim@modelatech.com',
  'usr-mtk017',
  'mtk017',
  'sandeepanc04@gmail.com',
  'usr-mtk004',
  'mtk004',
  'shibotoshk@modelatech.com',
  'usr-mtk007',
  'mtk007',
  'shuvamm@modelatech.com',
  'usr-mtk009',
  'mtk009',
  'smandal@modelatechnologies.com',
  'usr-mod116',
  'mod116',
  'subhabratas@modelatech.com',
  'usr-mtk022',
  'mtk022',
  'swagatac@modelatech.com',
  'usr-mtk024',
  'mtk024',
  'tiasha@modelatechnologies.com',
  'usr-222eh297',
  'usr-mod001',
  'mod001'
]);

let users: ServerUser[] = [...DEFAULT_SERVER_USERS];
let serverDeletedIds = new Set<string>([
  ...PERMANENTLY_DELETED_REQUEST_KEYS,
  'req-1572',
  'req-3779',
  'req-9074',
  'req-2709',
  'req-6425',
  'req-6677'
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
  const reqStatus = String(r.status || 'PENDING').trim().toUpperCase();

  if (
    reqId === 'REQ-6677' ||
    (empId === 'MTK023' &&
      reqStatus === 'PENDING' &&
      (reqTitle === 'abc' ||
        !r.submittedAt ||
        new Date(r.submittedAt).getTime() <= new Date('2026-11-06T10:28:00.000Z').getTime()))
  ) {
    return true;
  }

  if (
    r.isLiveStaffRequest ||
    Boolean(r.to && String(r.to).trim()) ||
    (Array.isArray(r.toUsers) && r.toUsers.length > 0)
  ) {
    return false;
  }
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
      users = parsed.users
        .filter(
          (u: ServerUser) =>
            u &&
            !PERMANENTLY_DELETED_REQUEST_KEYS.has(String(u.email || '').toLowerCase().trim()) &&
            !PERMANENTLY_DELETED_REQUEST_KEYS.has(String(u.id || '').toLowerCase().trim()) &&
            !PERMANENTLY_DELETED_REQUEST_KEYS.has(String(u.employeeId || '').toLowerCase().trim())
        )
        .map((u: ServerUser) => {
          const emailLower = String(u.email || '').toLowerCase().trim();
          const empIdUpper = String(u.employeeId || '').toUpperCase().trim();
          if (emailLower === 'aditichakraborty2005@gmail.com' || emailLower === 'aditichakrabarty2005@gmail.com') {
            return { ...u, employeeId: (!empIdUpper || empIdUpper === 'MOD008') ? 'MTK020' : empIdUpper };
          }
          if (emailLower === 'surupa008@gmail.com') {
            return { ...u, employeeId: (!empIdUpper || empIdUpper === 'MOD011') ? 'MTK023' : empIdUpper };
          }
          if (emailLower === 'smandal@modelatechnologies.com' || empIdUpper === 'MOD116') {
            return {
              ...u,
              name: 'Subhasri Mandal',
              employeeId: (!empIdUpper || empIdUpper === 'MOD000' || empIdUpper === 'MOD001') ? 'MOD116' : empIdUpper,
              avatar_url: 'https://ui-avatars.com/api/?name=Subhasri+Mandal&background=0284c7&color=fff'
            };
          }
          if (emailLower === 'poulamim@modelatech.com' || empIdUpper === 'MTK017') {
            return {
              ...u,
              name: 'Poulami Manna',
              employeeId: (!empIdUpper || empIdUpper === 'MOD000') ? 'MTK017' : empIdUpper,
              avatar_url: 'https://ui-avatars.com/api/?name=Poulami+Manna&background=0284c7&color=fff'
            };
          }
          if (emailLower === 'tiasha@modelatechnologies.com' || empIdUpper === 'MOD001') {
            return {
              ...u,
              name: 'Tiasha Chakraborty',
              employeeId: (!empIdUpper || empIdUpper === 'MOD000') ? 'MOD001' : empIdUpper,
              avatar_url: 'https://ui-avatars.com/api/?name=Tiasha+Chakraborty&background=0284c7&color=fff'
            };
          }
          return u;
        });
      DEFAULT_SERVER_USERS.forEach(defU => {
        if (!users.some(u => u.email.toLowerCase().trim() === defU.email.toLowerCase().trim())) {
          users.push(defU);
        }
      });
    }
    const activeLiveEmailsAndIds = new Set<string>();
    users.forEach(u => {
      if (u && u.isLiveRequest && (u.status === 'PENDING' || u.status === 'APPROVED')) {
        const em = String(u.email || '').toLowerCase().trim();
        const id = String(u.id || '').toLowerCase().trim();
        if (em && !PERMANENTLY_DELETED_REQUEST_KEYS.has(em)) {
          activeLiveEmailsAndIds.add(em);
          serverDeletedIds.delete(em);
        }
        if (id && !PERMANENTLY_DELETED_REQUEST_KEYS.has(id)) {
          activeLiveEmailsAndIds.add(id);
          serverDeletedIds.delete(id);
        }
      }
    });
    if (Array.isArray(parsed.deletedIds)) {
      parsed.deletedIds.forEach((id: string) => {
        const clean = String(id).toLowerCase().trim();
        if (!PROTECTED_ACTIVE_KEYS.has(clean) && !activeLiveEmailsAndIds.has(clean)) {
          serverDeletedIds.add(clean);
        }
      });
    }
    if (Array.isArray(parsed.employees)) {
      persistedEmployees = parsed.employees.filter((pe: any) => {
        const idUp = String(pe?.id || '').toUpperCase().trim();
        const emLo = String(pe?.email || '').toLowerCase().trim();
        return idUp !== 'MOD008' && idUp !== 'MOD011' && idUp !== 'MTK006' && emLo !== 'sushovand@modelatech.com';
      });
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
    id: "MTK020",
    firstName: "Aditi",
    lastName: "Chakrabarty",
    email: "aditichakraborty2005@gmail.com",
    joiningDate: "2026-09-09",
    designation: "Intern",
    phone: "6291 115 600",
    department: "General Staff",
    status: "ACTIVE",
    location: "San Francisco HQ",
    compensation: { basic: 50000, allowances: 15000 },
    avatar: "https://ui-avatars.com/api/?name=Aditi+Chakrabarty&background=0284c7&color=fff"
  },
  {
    id: "MTK023",
    firstName: "Debrupa",
    lastName: "Ghosh",
    email: "surupa008@gmail.com",
    joiningDate: "2026-10-01",
    designation: "Intern",
    phone: "9007930757",
    department: "General Staff",
    status: "ACTIVE",
    location: "San Francisco HQ",
    compensation: { basic: 50000, allowances: 15000 },
    avatar: "https://ui-avatars.com/api/?name=Debrupa+Ghosh&background=0284c7&color=fff"
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
    compensation: { basic: 50000, allowances: 15000 },
    avatar: "https://ui-avatars.com/api/?name=Satyajit+Mazumder&background=0284c7&color=fff"
  },
  {
    id: "MTK018",
    firstName: "Abhinandan",
    lastName: "Baitalik",
    email: "abhinandanb@modelatech.com",
    joiningDate: "2026-11-04",
    designation: "Staff Candidate",
    phone: "",
    department: "General Staff",
    status: "ACTIVE",
    location: "San Francisco HQ",
    compensation: { basic: 50000, allowances: 15000 },
    avatar: "https://ui-avatars.com/api/?name=Abhinandan+Baitalik&background=0284c7&color=fff"
  },
  {
    id: "MTK019",
    firstName: "Batas",
    lastName: "chandra mahato",
    email: "batasm@modelatech.com",
    joiningDate: "2026-11-04",
    designation: "Staff Candidate",
    phone: "",
    department: "General Staff",
    status: "ACTIVE",
    location: "San Francisco HQ",
    compensation: { basic: 50000, allowances: 15000 },
    avatar: "https://ui-avatars.com/api/?name=Batas+chandra+mahato&background=0284c7&color=fff"
  },
  {
    id: "MTK016",
    firstName: "Damayanti",
    lastName: "Chanda",
    email: "damayantic@modelatech.com",
    joiningDate: "2026-11-04",
    designation: "Staff Candidate",
    phone: "",
    department: "General Staff",
    status: "ACTIVE",
    location: "San Francisco HQ",
    compensation: { basic: 50000, allowances: 15000 },
    avatar: "https://ui-avatars.com/api/?name=Damayanti+Chanda&background=0284c7&color=fff"
  },
  {
    id: "MOD106",
    firstName: "Modela",
    lastName: "Tech",
    email: "modelatech4@gmail.com",
    joiningDate: "2026-11-04",
    designation: "Staff Candidate",
    phone: "",
    department: "General Staff",
    status: "ACTIVE",
    location: "San Francisco HQ",
    compensation: { basic: 95000, allowances: 30000 },
    avatar: "https://ui-avatars.com/api/?name=Modela+Tech&background=3b82f6&color=fff"
  },
  {
    id: "MTK012",
    firstName: "Mosarof",
    lastName: "Hosen",
    email: "mosarafh@modelatech.com",
    joiningDate: "2026-11-04",
    designation: "Staff Candidate",
    phone: "",
    department: "General Staff",
    status: "ACTIVE",
    location: "San Francisco HQ",
    compensation: { basic: 50000, allowances: 15000 },
    avatar: "https://ui-avatars.com/api/?name=Mosarof+Hosen&background=0284c7&color=fff"
  },
  {
    id: "MTK003",
    firstName: "Pritam",
    lastName: "Saha",
    email: "pat@modelatech.com",
    joiningDate: "2026-11-04",
    designation: "Staff Candidate",
    phone: "",
    department: "General Staff",
    status: "ACTIVE",
    location: "San Francisco HQ",
    compensation: { basic: 50000, allowances: 15000 },
    avatar: "https://ui-avatars.com/api/?name=Pritam+Saha&background=0284c7&color=fff"
  },
  {
    id: "MTK021",
    firstName: "Poulami",
    lastName: "Das",
    email: "poulamid@modelatech.com",
    joiningDate: "2026-11-04",
    designation: "Staff Candidate",
    phone: "",
    department: "General Staff",
    status: "ACTIVE",
    location: "San Francisco HQ",
    compensation: { basic: 50000, allowances: 15000 },
    avatar: "https://ui-avatars.com/api/?name=Poulami+Das&background=0284c7&color=fff"
  },
  {
    id: "MTK017",
    firstName: "Poulami",
    lastName: "Manna",
    email: "poulamim@modelatech.com",
    joiningDate: "2026-11-05",
    designation: "Staff Candidate",
    phone: "",
    department: "General Staff",
    status: "ACTIVE",
    location: "San Francisco HQ",
    compensation: { basic: 50000, allowances: 15000 },
    avatar: "https://ui-avatars.com/api/?name=Poulami+Manna&background=0284c7&color=fff"
  },
  {
    id: "MTK004",
    firstName: "Sandeepan",
    lastName: "Choudhury",
    email: "sandeepanc04@gmail.com",
    joiningDate: "2026-11-04",
    designation: "Staff Candidate",
    phone: "",
    department: "General Staff",
    status: "ACTIVE",
    location: "San Francisco HQ",
    compensation: { basic: 50000, allowances: 15000 },
    avatar: "https://ui-avatars.com/api/?name=Sandeepan+Choudhury&background=0284c7&color=fff"
  },
  {
    id: "MTK007",
    firstName: "Shibotosh",
    lastName: "Karmakar",
    email: "shibotoshk@modelatech.com",
    joiningDate: "2026-11-04",
    designation: "Staff Candidate",
    phone: "",
    department: "General Staff",
    status: "ACTIVE",
    location: "San Francisco HQ",
    compensation: { basic: 50000, allowances: 15000 },
    avatar: "https://ui-avatars.com/api/?name=Shibotosh+Karmakar&background=0284c7&color=fff"
  },
  {
    id: "MTK009",
    firstName: "Shuvam",
    lastName: "Mandal",
    email: "shuvamm@modelatech.com",
    joiningDate: "2026-11-04",
    designation: "Staff Candidate",
    phone: "",
    department: "General Staff",
    status: "ACTIVE",
    location: "San Francisco HQ",
    compensation: { basic: 50000, allowances: 15000 },
    avatar: "https://ui-avatars.com/api/?name=Shuvam+Mandal&background=0284c7&color=fff"
  },
  {
    id: "MOD116",
    firstName: "Subhasri",
    lastName: "Mandal",
    email: "smandal@modelatechnologies.com",
    joiningDate: "2026-11-04",
    designation: "Staff Candidate",
    phone: "",
    department: "General Staff",
    status: "ACTIVE",
    location: "San Francisco HQ",
    compensation: { basic: 50000, allowances: 15000 },
    avatar: "https://ui-avatars.com/api/?name=Subhasri+Mandal&background=0284c7&color=fff"
  },
  {
    id: "MTK022",
    firstName: "Subhabrata",
    lastName: "Saha",
    email: "subhabratas@modelatech.com",
    joiningDate: "2026-11-04",
    designation: "Staff Candidate",
    phone: "",
    department: "General Staff",
    status: "ACTIVE",
    location: "San Francisco HQ",
    compensation: { basic: 50000, allowances: 15000 },
    avatar: "https://ui-avatars.com/api/?name=Subhabrata+Saha&background=0284c7&color=fff"
  },
  {
    id: "MTK024",
    firstName: "Swagata",
    lastName: "Chattopadhyay",
    email: "swagatac@modelatech.com",
    joiningDate: "2026-11-04",
    designation: "Staff Candidate",
    phone: "",
    department: "General Staff",
    status: "ACTIVE",
    location: "San Francisco HQ",
    compensation: { basic: 50000, allowances: 15000 },
    avatar: "https://ui-avatars.com/api/?name=Swagata+Chattopadhyay&background=0284c7&color=fff"
  },
  {
    id: "MOD001",
    firstName: "Tiasha",
    lastName: "Chakraborty",
    email: "tiasha@modelatechnologies.com",
    joiningDate: "2026-11-06",
    designation: "Staff Candidate",
    phone: "",
    department: "General Staff",
    status: "ACTIVE",
    location: "San Francisco HQ",
    compensation: { basic: 50000, allowances: 15000 },
    avatar: "https://ui-avatars.com/api/?name=Tiasha+Chakraborty&background=0284c7&color=fff"
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
  subType?: string;
  title: string;
  amountOrDays: string;
  startDate?: string;
  endDate?: string;
  requestDate?: string;
  targetDates?: string;
  priority: string;
  status: string;
  description: string;
  submittedAt: string;
  supervisorName?: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  remarks?: string;
  to?: string;
  cc?: string;
  toUsers?: any[];
  ccUsers?: any[];
  isLiveStaffRequest?: boolean;
}

let staffRequests: ServerStaffRequest[] = [...persistedRequests];
let payrollRecords: any[] = [...persistedPayroll];
let policyRecords: any[] = [...persistedPolicies];

if (persistedEmployees.length > 0) {
  persistedEmployees.forEach(pe => {
    if (!pe || !pe.id || String(pe.id).toUpperCase().trim() === 'MOD008') return;
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

const saveServerState = (immediate = false) => {
  if (saveStateTimer) clearTimeout(saveStateTimer);
  const writeNow = () => {
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
      if (immediate) {
        fs.writeFileSync(STATE_FILE_PATH, payload, 'utf-8');
      } else {
        fs.promises.writeFile(STATE_FILE_PATH, payload, 'utf-8').catch(() => {});
      }
    } catch {}
  };
  if (immediate) {
    writeNow();
  } else {
    saveStateTimer = setTimeout(writeNow, 150);
  }
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
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
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
    if (sa && sa.status === 'APPROVED') {
      return res.json({ success: true, user: sa, message: 'Super Admin active' });
    }
  }
  const now = new Date().toISOString();
  const existing = users.find(u => u.email.toLowerCase().trim() === emailLower);
  const recordId = newUser.id || existing?.id || `USR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const record: ServerUser = {
    ...(existing || {}),
    ...newUser,
    id: recordId,
    uid: newUser.uid || recordId,
    email: emailLower,
    name: (newUser.name || existing?.name || emailLower).trim(),
    status: 'PENDING',
    role: null,
    employeeId: undefined,
    requestedAt: newUser.requestedAt || now,
    updatedAt: now,
    notificationUnread: true,
    isLiveRequest: true
  };

  serverDeletedIds.delete(emailLower);
  serverDeletedIds.delete(`req-${emailLower.replace(/[^a-z0-9]/g, '_')}`);
  if (record.id) serverDeletedIds.delete(record.id.toLowerCase());
  if (record.uid) serverDeletedIds.delete(record.uid.toLowerCase());
  if (existing?.id) serverDeletedIds.delete(existing.id.toLowerCase());
  if (existing?.uid) serverDeletedIds.delete(existing.uid.toLowerCase());
  if (existing?.employeeId) serverDeletedIds.delete(existing.employeeId.toLowerCase());

  users = [
    record,
    ...users.filter(u => u.email.toLowerCase().trim() !== emailLower && u.id !== record.id)
  ];
  saveServerState(true);
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
  const cleanEmail = newEmp.email ? String(newEmp.email).toLowerCase().trim() : '';
  const idx = employees.findIndex(e =>
    cleanEmail
      ? e.email?.toLowerCase().trim() === cleanEmail
      : e.id.toUpperCase() === String(newEmp.id).toUpperCase()
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
  employees = employees.map(e => {
    const isMatch = cleanEmail
      ? e.email?.toLowerCase().trim() === cleanEmail
      : e.id === oldId;
    return isMatch ? { ...(employee || e), id: newId } : e;
  });
  users = users.map(u => {
    const isMatch = cleanEmail
      ? u.email?.toLowerCase().trim() === cleanEmail
      : u.employeeId === oldId;
    return isMatch ? { ...u, employeeId: newId } : u;
  });
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
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  staffRequests = staffRequests.filter(r => !isExcludedServerStaffRequest(r));
  res.json({ success: true, requests: staffRequests });
});

app.post('/api/requests', (req: Request, res: Response) => {
  const newReq = { ...req.body, isLiveStaffRequest: true };
  if (!newReq || !newReq.title) {
    return res.status(400).json({ success: false, message: 'Invalid request' });
  }
  if (isExcludedServerStaffRequest(newReq)) {
    return res.json({ success: true, request: newReq });
  }
  staffRequests = [newReq, ...staffRequests.filter(r => r.id !== newReq.id && !isExcludedServerStaffRequest(r))];
  saveServerState(true);
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
  saveServerState(true);
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
  const { getFirestore, doc, setDoc, deleteDoc, setLogLevel } = await import('firebase/firestore');
  setLogLevel('silent');
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
