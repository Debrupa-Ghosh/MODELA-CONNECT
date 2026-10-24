import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Employee } from '../types';
import { EmployeeDossierModal } from '../components/employees/EmployeeDossierModal';
import { EditEmployeeModal } from '../components/employees/EditEmployeeModal';
import {
  Users,
  Search,
  Download,
  Upload,
  UserPlus,
  Eye,
  Edit2,
  Trash2,
  Phone,
  ArrowUpDown,
  Plus,
  X,
  FileText,
  Check,
  FileSpreadsheet,
  CheckCircle2,
  Save,
  FileUp,
  Copy,
  AlertCircle
} from 'lucide-react';

export const EmployeesPage: React.FC = () => {
  const { employees, addEmployee, bulkAddEmployees, updateEmployee, deleteEmployee, showToast } = useApp();
  const { deleteUser, hasFullAccess, isSuperAdmin, isDirector, isExecutiveDirector, isHRManager, currentUser } = useAuth();

  const canManageEmployees =
    !isDirector &&
    !isExecutiveDirector &&
    currentUser?.role !== 'DIRECTOR' &&
    currentUser?.role !== 'EXECUTIVE_DIRECTOR' &&
    Boolean(
      hasFullAccess ||
      isSuperAdmin ||
      isHRManager ||
      currentUser?.role === 'SUPER_ADMIN' ||
      currentUser?.role === 'HR' ||
      currentUser?.role === 'MANAGER' ||
      currentUser?.role === 'HR_MANAGER'
    );

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'id' | 'name' | 'joiningDate' | 'designation'>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Count employees with incomplete details
  const pendingDetailsCount = employees.filter(
    e => !e.firstName?.trim() && !e.lastName?.trim() && !e.joiningDate?.trim()
  ).length;

  // Modals state
  const [selectedDossierEmp, setSelectedDossierEmp] = useState<Employee | null>(null);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [parsedEmployees, setParsedEmployees] = useState<Employee[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add Employee Form state
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('+1 (555) 000-0000');
  const [newDepartment, setNewDepartment] = useState('Engineering');
  const [newDesignation, setNewDesignation] = useState('Software Engineer');
  const [newLocation, setNewLocation] = useState('San Francisco HQ');
  const [newBasic, setNewBasic] = useState('50000');
  const [newPan, setNewPan] = useState('');
  const [newBankAccount, setNewBankAccount] = useState('');
  
  // Allowances breakdown
  const [newHra, setNewHra] = useState('6000');
  const [newMedical, setNewMedical] = useState('2000');
  const [newSpecial, setNewSpecial] = useState('5000');
  const [newInternet, setNewInternet] = useState('2000');

  // Deductions breakdown
  const [newProfessionalTax, setNewProfessionalTax] = useState('200');
  const [newPfContribution, setNewPfContribution] = useState('1800');
  const [newGroupHealthInsurance, setNewGroupHealthInsurance] = useState('1700');

  // Sort toggle handler
  const handleSort = (field: 'id' | 'name' | 'joiningDate' | 'designation') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter & Sort
  const filteredEmployees = employees
    .filter(emp => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      return (
        emp.id.toLowerCase().includes(q) ||
        fullName.includes(q) ||
        emp.joiningDate.toLowerCase().includes(q) ||
        emp.designation.toLowerCase().includes(q) ||
        emp.phone.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let valA = '';
      let valB = '';
      if (sortField === 'id') {
        valA = a.id;
        valB = b.id;
      } else if (sortField === 'name') {
        valA = `${a.firstName} ${a.lastName}`;
        valB = `${b.firstName} ${b.lastName}`;
      } else if (sortField === 'joiningDate') {
        valA = a.joiningDate;
        valB = b.joiningDate;
      } else if (sortField === 'designation') {
        valA = a.designation;
        valB = b.designation;
      }
      const cmp = valA.localeCompare(valB);
      return sortDirection === 'asc' ? cmp : -cmp;
    });

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['EMP ID', 'First Name', 'Last Name', 'Joining Date', 'Designation', 'Department', 'Phone', 'Location', 'Basic Salary', 'Allowances'];
    const rows = employees.map(e => [
      e.id,
      e.firstName,
      e.lastName,
      e.joiningDate,
      `"${e.designation}"`,
      `"${e.department}"`,
      `"${e.phone}"`,
      `"${e.location || 'San Francisco HQ'}"`,
      e.compensation?.basic || 0,
      e.compensation?.allowances || 0
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `modela-employee-master-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV Exported', `Exported ${employees.length} employee master records.`);
  };

  // Bulk Import CSV & XLSX Parsing Engine
  const parseRecordsFromRawData = (rows: any[][]): Employee[] => {
    if (!rows || rows.length === 0) return [];

    // Filter out completely blank rows
    const cleanRows = rows.filter(
      row => Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
    );
    if (cleanRows.length === 0) return [];

    // Check if row 0 is a header row
    let startIndex = 0;
    const firstRow = cleanRows[0].map(c => String(c ?? '').toLowerCase().trim());
    const isHeader = firstRow.some(
      c =>
        c.includes('id') ||
        c.includes('name') ||
        c.includes('date') ||
        c.includes('doj') ||
        c.includes('join') ||
        c.includes('designation') ||
        c.includes('department') ||
        c.includes('dept') ||
        c.includes('salary') ||
        c.includes('allowance') ||
        c.includes('phone') ||
        c.includes('location')
    );

    let idIdx = -1;
    let firstNameIdx = -1;
    let lastNameIdx = -1;
    let joiningDateIdx = -1;
    let designationIdx = -1;
    let departmentIdx = -1;
    let phoneIdx = -1;
    let locationIdx = -1;
    let basicSalaryIdx = -1;
    let allowancesIdx = -1;

    if (isHeader) {
      startIndex = 1;
      firstRow.forEach((col, idx) => {
        const clean = col.replace(/[^a-z0-9]/g, '');
        if (clean === 'empid' || clean === 'id' || clean === 'employeeid') idIdx = idx;
        else if (clean === 'firstname' || clean === 'first') firstNameIdx = idx;
        else if (clean === 'lastname' || clean === 'last') lastNameIdx = idx;
        else if (clean.includes('joining') || clean.includes('doj') || clean.includes('startdate')) joiningDateIdx = idx;
        else if (clean.includes('designation') || clean.includes('title') || clean.includes('role')) designationIdx = idx;
        else if (clean.includes('department') || clean.includes('dept')) departmentIdx = idx;
        else if (clean.includes('phone') || clean.includes('mobile') || clean.includes('contact')) phoneIdx = idx;
        else if (clean.includes('location') || clean.includes('office') || clean.includes('city') || clean.includes('hq')) locationIdx = idx;
        else if (clean.includes('basicsalary') || clean.includes('basic')) basicSalaryIdx = idx;
        else if (clean.includes('allowance') || clean.includes('allowances')) allowancesIdx = idx;
      });
    }

    // Positional fallback for 10 fields:
    // 0: EMP ID, 1: First Name, 2: Last Name, 3: Joining Date, 4: Designation, 5: Department, 6: Phone, 7: Location, 8: Basic Salary, 9: Allowances
    if (idIdx === -1) idIdx = 0;
    if (firstNameIdx === -1) firstNameIdx = 1;
    if (lastNameIdx === -1) lastNameIdx = 2;
    if (joiningDateIdx === -1) joiningDateIdx = 3;
    if (designationIdx === -1) designationIdx = 4;
    if (departmentIdx === -1) departmentIdx = 5;
    if (phoneIdx === -1) phoneIdx = 6;
    if (locationIdx === -1) locationIdx = 7;
    if (basicSalaryIdx === -1) basicSalaryIdx = 8;
    if (allowancesIdx === -1) allowancesIdx = 9;

    let maxIdNum = 7;
    employees.forEach(e => {
      const match = e.id.match(/^MOD0*(\d+)$/i);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > maxIdNum) maxIdNum = val;
      }
    });

    const parsed: Employee[] = [];
    const dataRows = cleanRows.slice(startIndex);

    dataRows.forEach(row => {
      const rawId = String(row[idIdx] ?? '').trim();
      const rawFirst = String(row[firstNameIdx] ?? '').trim();
      const rawLast = String(row[lastNameIdx] ?? '').trim();
      const rawDoj = String(row[joiningDateIdx] ?? '').trim();
      const rawDesig = String(row[designationIdx] ?? '').trim();
      const rawDept = String(row[departmentIdx] ?? '').trim();
      const rawPhone = String(row[phoneIdx] ?? '').trim();
      const rawLoc = String(row[locationIdx] ?? '').trim();
      const rawBasic = String(row[basicSalaryIdx] ?? '').replace(/[^0-9.-]/g, '').trim();
      const rawAllowances = String(row[allowancesIdx] ?? '').replace(/[^0-9.-]/g, '').trim();

      // Skip row if it lacks any identifying content
      if (!rawId && !rawFirst && !rawLast && !rawDesig && !rawDept) return;

      maxIdNum++;
      const empId = rawId || `MOD${String(maxIdNum).padStart(3, '0')}`;
      const firstName = rawFirst || 'Staff';
      const lastName = rawLast || 'Member';

      // Standardize Joining Date
      let joiningDate = rawDoj;
      if (!joiningDate) {
        joiningDate = new Date().toISOString().split('T')[0];
      } else if (/^\d+$/.test(joiningDate) && Number(joiningDate) > 20000 && Number(joiningDate) < 60000) {
        // Excel serial date code
        const d = new Date(Math.round((Number(joiningDate) - 25569) * 86400 * 1000));
        joiningDate = d.toISOString().split('T')[0];
      } else if (joiningDate.includes('/')) {
        const parts = joiningDate.split('/');
        if (parts.length === 3 && parts[2].length === 4) {
          joiningDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }
      }

      const designation = rawDesig || 'Software Engineer';
      const department = rawDept || 'Engineering';
      const phone = rawPhone || '+1 (555) 000-0000';
      const location = rawLoc || 'San Francisco HQ';
      const numBasic = Number(rawBasic) > 0 ? Number(rawBasic) : 50000;
      const numAllowances = Number(rawAllowances) >= 0 ? Number(rawAllowances) : 15000;

      const numHra = Math.round(numAllowances * 0.4);
      const numMedical = Math.round(numAllowances * 0.15);
      const numSpecial = Math.round(numAllowances * 0.35);
      const numInternet = Math.max(0, numAllowances - (numHra + numMedical + numSpecial));
      const numPT = 200;
      const numPF = 1800;
      const numHealth = 1700;
      const totalDeductions = numPT + numPF + numHealth;
      const grossSalary = numBasic + numAllowances;
      const netCompensation = grossSalary - totalDeductions;

      const email = `${firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${lastName.toLowerCase().replace(/[^a-z0-9]/g, '')}@modela.io`;
      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName + ' ' + lastName)}&background=0284c7&color=fff`;

      parsed.push({
        id: empId,
        firstName,
        lastName,
        joiningDate,
        designation,
        department,
        phone,
        location,
        status: 'ACTIVE',
        email,
        avatar,
        compensation: {
          basic: numBasic,
          allowances: numAllowances,
          allowanceBreakdown: {
            hra: numHra,
            medical: numMedical,
            special: numSpecial,
            internet: numInternet
          },
          deductionBreakdown: {
            professionalTax: numPT,
            pfContribution: numPF,
            groupHealthInsurance: numHealth
          },
          totalDeductions,
          grossSalary,
          netCompensation
        }
      });
    });

    return parsed;
  };

  // Handle CSV / XLSX file selection from device
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
        const parsed = parseRecordsFromRawData(rows);
        if (parsed.length > 0) {
          setParsedEmployees(parsed);
          setUploadedFileName(`${file.name} (${parsed.length} employees)`);
          showToast('File Loaded', `Successfully parsed ${parsed.length} employee records from ${file.name}. Review and click "Save Changes".`, 'info');
        } else {
          showToast('Empty or Invalid File', 'No employee records found in file. Please ensure data matches the required format.', 'error');
        }
      } catch (err) {
        console.error('File parsing error:', err);
        showToast('Parsing Failed', 'Unable to parse file. Please verify CSV or XLSX structure.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Commit and Save Changes directly to Database & Employees Directory
  const handleSaveBulkChanges = async () => {
    const toSave = parsedEmployees;
    if (toSave.length === 0) {
      showToast('No Records', 'Please import a CSV or XLSX file first.', 'error');
      return;
    }

    setIsSavingBulk(true);
    try {
      const count = await bulkAddEmployees(toSave);
      showToast('Changes Saved', `Successfully saved ${count} employee records in the database. Visible across all browsers.`, 'success');
      setIsImportModalOpen(false);
      setParsedEmployees([]);
      setUploadedFileName('');
    } catch (err) {
      console.error('Error saving bulk employees:', err);
      showToast('Save Failed', 'Error saving employee records to database.', 'error');
    } finally {
      setIsSavingBulk(false);
    }
  };

  // Add Employee submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextNum = employees.length + 1;
    const autoId = `MOD${String(nextNum).padStart(3, '0')}`;

    const numBasic = Number(newBasic) || 50000;
    const numHra = Number(newHra) || 0;
    const numMedical = Number(newMedical) || 0;
    const numSpecial = Number(newSpecial) || 0;
    const numInternet = Number(newInternet) || 0;
    const totalAllowances = numHra + numMedical + numSpecial + numInternet;

    const numPT = Number(newProfessionalTax) || 200;
    const numPF = Number(newPfContribution) || 1800;
    const numHealth = Number(newGroupHealthInsurance) || 1700;
    const totalDeductions = numPT + numPF + numHealth;

    const grossSalary = numBasic + totalAllowances;
    const netCompensation = grossSalary - totalDeductions;

    await addEmployee({
      firstName: newFirstName.trim(),
      lastName: newLastName.trim(),
      email: newEmail.trim() || `${newFirstName.toLowerCase()}.${newLastName.toLowerCase()}@modela.io`,
      phone: newPhone.trim(),
      department: newDepartment,
      designation: newDesignation.trim(),
      joiningDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      location: newLocation,
      pan: newPan.trim().toUpperCase(),
      bankAccount: newBankAccount.trim(),
      compensation: {
        basic: numBasic,
        allowances: totalAllowances,
        allowanceBreakdown: {
          hra: numHra,
          medical: numMedical,
          special: numSpecial,
          internet: numInternet
        },
        deductionBreakdown: {
          professionalTax: numPT,
          pfContribution: numPF,
          groupHealthInsurance: numHealth
        },
        totalDeductions,
        grossSalary,
        netCompensation
      }
    });

    showToast('Employee Added', `Created personnel master record for ${newFirstName} ${newLastName} (${autoId})`);
    setIsAddModalOpen(false);
    setNewFirstName('');
    setNewLastName('');
    setNewEmail('');
    setNewPan('');
    setNewBankAccount('');
  };

  // Delete employee record handler
  const handleDelete = (emp: Employee) => {
    setEmployeeToDelete(emp);
  };

  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    const targetId = employeeToDelete.id;
    const targetEmail = employeeToDelete.email;
    const displayName = [employeeToDelete.firstName, employeeToDelete.lastName].filter(Boolean).join(' ') || targetEmail || targetId;
    await deleteEmployee(targetId, targetEmail);
    if (targetEmail || targetId) {
      await deleteUser(targetEmail || targetId);
    }
    setEmployeeToDelete(null);
    if (selectedDossierEmp?.id === targetId) setSelectedDossierEmp(null);
    if (editingEmp?.id === targetId) setEditingEmp(null);
    showToast('Record Deleted', `Successfully deleted employee record ${displayName} (${targetId}) from Employees and Approved Users directory.`, 'info');
  };

  return (
    <div className="space-y-6 max-w-[1550px] mx-auto antialiased font-sans text-white">
      
      {/* Top Header Row (Dark Navy Box matching Image) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0B1528] p-6 sm:p-7 rounded-2xl border border-[#1E2E4E] shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Employee Master
            </h1>
            <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-[#172554] border border-[#1E3A8A] text-[#93C5FD]">
              {employees.length} Records
            </span>
            {pendingDetailsCount > 0 && (
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-950/80 border border-amber-600/60 text-amber-300 animate-pulse">
                {pendingDetailsCount} Details Pending
              </span>
            )}
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 font-medium">
            Authoritative directory tracking employee identity, joining date, designation, and contact details.
          </p>
        </div>

        {/* 3 Top Right Action Buttons (Hidden for Director view-only role) */}
        {canManageEmployees && (
          <div className="flex items-center gap-3 flex-wrap">
            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#131E36] hover:bg-[#1E2E4E] border border-[#203050] text-slate-200 text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {/* Bulk Import CSV Button */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0C2340] hover:bg-[#13325C] border border-[#1D4ED8]/60 text-[#60A5FA] text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Bulk Import CSV</span>
            </button>

            {/* Add New Employee Button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-900/30 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New Employee</span>
            </button>
          </div>
        )}
      </div>

      {/* Notice if any newly signed-up employee has details pending */}
      {canManageEmployees && pendingDetailsCount > 0 && (
        <div className="p-4 rounded-2xl bg-[#261503]/85 border border-amber-800/80 text-xs text-amber-200 flex items-start justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-3">
            <span className="text-amber-400 font-bold text-base mt-0.5">ℹ</span>
            <div className="space-y-0.5">
              <p className="font-bold text-amber-300">
                New Sign-Up Accounts Pending Profile Completion ({pendingDetailsCount})
              </p>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                New user sign-ups are automatically assigned the Employee role. Name, DOJ, and Contact details remain blank until Super Admin or HR Manager populates them using the <strong>Edit (Pencil)</strong> button.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search Input Bar (Matches Image 1 Exactly) */}
      <div className="relative w-full bg-[#080E1C] border border-[#1E293B] rounded-2xl px-4 py-3 flex items-center gap-3 shadow-inner">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by Emp ID, Name, DOJ, Designation, or Phone..."
          className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-slate-400 hover:text-white text-xs"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Employee Master Table Card (Matches Image 1 Exactly) */}
      <div className="bg-[#070D1D] rounded-2xl border border-[#1E293B] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1E293B] bg-[#0A1224]/80 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th
                  onClick={() => handleSort('id')}
                  className="py-3.5 px-5 cursor-pointer hover:text-white select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>EMP ID</span>
                    <span className="text-slate-500">⇅</span>
                  </div>
                </th>

                <th
                  onClick={() => handleSort('name')}
                  className="py-3.5 px-5 cursor-pointer hover:text-white select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>NAME</span>
                    <span className="text-slate-500">⇅</span>
                  </div>
                </th>

                <th
                  onClick={() => handleSort('joiningDate')}
                  className="py-3.5 px-5 cursor-pointer hover:text-white select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>DOJ</span>
                    <span className="text-slate-500">⇅</span>
                  </div>
                </th>

                <th
                  onClick={() => handleSort('designation')}
                  className="py-3.5 px-5 cursor-pointer hover:text-white select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>DESIGNATION</span>
                    <span className="text-slate-500">⇅</span>
                  </div>
                </th>

                <th className="py-3.5 px-5 select-none">
                  CONTACT
                </th>

                <th className="py-3.5 px-5 text-right select-none">
                  ACTIONS
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#1E293B]/70">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No employees matched your search query.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => (
                  <tr
                    key={emp.id}
                    className="hover:bg-[#0C162E] transition-colors group cursor-pointer"
                    onClick={() => setSelectedDossierEmp(emp)}
                  >
                    {/* EMP ID: Glowing dark cyan badge (Image 1) */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <span className="inline-block bg-[#001E3D] text-[#00E5FF] font-mono text-xs font-bold px-2.5 py-1 rounded-md border border-[#00558F] shadow-[0_0_12px_rgba(0,229,255,0.12)]">
                        {emp.id}
                      </span>
                    </td>

                    {/* NAME: White bold text or Blank indicator */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      {!emp.firstName?.trim() && !emp.lastName?.trim() ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-amber-400 font-semibold italic text-xs flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            [Name Blank]
                          </span>
                          {emp.email && (
                            <span className="text-[11px] text-slate-400 font-mono">
                              {emp.email}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-white font-bold text-xs sm:text-sm">
                            {emp.firstName} {emp.lastName}
                          </span>
                          {emp.email && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {emp.email}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* DOJ: Monospace slate text or Blank indicator */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      {!emp.joiningDate?.trim() ? (
                        <span className="text-amber-400/80 italic font-mono text-xs">
                          — [DOJ Blank]
                        </span>
                      ) : (
                        <span className="text-slate-300 font-mono text-xs">
                          {emp.joiningDate}
                        </span>
                      )}
                    </td>

                    {/* DESIGNATION: Clean slate text */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      {!emp.designation?.trim() ? (
                        <span className="text-slate-400 italic text-xs">—</span>
                      ) : (
                        <span className="text-slate-200 text-xs font-medium">{emp.designation}</span>
                      )}
                    </td>

                    {/* CONTACT: Phone icon + number or Blank indicator */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      {!emp.phone?.trim() ? (
                        <span className="text-amber-400/80 italic font-mono text-xs">
                          — [Contact Blank]
                        </span>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-300 font-mono text-xs">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{emp.phone}</span>
                        </div>
                      )}
                    </td>

                    {/* ACTIONS: Eye, Pencil, Trash icons */}
                    <td
                      className="py-4 px-5 whitespace-nowrap text-right"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2 text-slate-400">
                        {/* Quick add details badge if Name/DOJ/Contact is blank */}
                        {canManageEmployees && (!emp.firstName?.trim() && !emp.lastName?.trim() && !emp.joiningDate?.trim()) && (
                          <button
                            onClick={() => setEditingEmp(emp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold transition-colors cursor-pointer mr-1"
                            title="Add Name, DOJ, and Contact details"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Add Details</span>
                          </button>
                        )}

                        {/* Eye: View Dossier (Image 2) */}
                        <button
                          onClick={() => setSelectedDossierEmp(emp)}
                          className="p-1.5 rounded-lg hover:text-sky-300 hover:bg-[#131E36] transition-colors cursor-pointer"
                          title="View Employee Dossier"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Pencil: Edit Profile */}
                        {canManageEmployees && (
                          <button
                            onClick={() => setEditingEmp(emp)}
                            className="p-1.5 rounded-lg hover:text-white hover:bg-[#131E36] transition-colors cursor-pointer"
                            title="Edit Profile & Allowances/Deductions"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Trash: Delete Record */}
                        {canManageEmployees && (
                          <button
                            onClick={() => handleDelete(emp)}
                            className="p-1.5 rounded-lg hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete Employee"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Dossier Modal (Matches Image 2 Exactly) */}
      <EmployeeDossierModal
        employee={selectedDossierEmp}
        isOpen={Boolean(selectedDossierEmp)}
        onClose={() => setSelectedDossierEmp(null)}
        onEdit={
          canManageEmployees
            ? emp => {
                setSelectedDossierEmp(null);
                setEditingEmp(emp);
              }
            : undefined
        }
        onDelete={
          canManageEmployees
            ? emp => {
                setSelectedDossierEmp(null);
                handleDelete(emp);
              }
            : undefined
        }
      />

      {/* Edit Employee Modal */}
      <EditEmployeeModal
        employee={editingEmp}
        isOpen={Boolean(editingEmp)}
        onClose={() => setEditingEmp(null)}
      />

      {/* Add New Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-[#080E1C] border border-[#1E2E4E] rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 text-white font-sans">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-[#00E5FF]" />
                <h3 className="text-lg font-bold text-white">Add New Employee</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl bg-[#131E36] hover:bg-[#1E2E4E] border border-[#203050] text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rachel"
                    value={newFirstName}
                    onChange={e => setNewFirstName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Green"
                    value={newLastName}
                    onChange={e => setNewLastName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Solutions Architect"
                    value={newDesignation}
                    onChange={e => setNewDesignation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Location</label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={e => setNewLocation(e.target.value)}
                    placeholder="San Francisco HQ"
                    className="w-full px-3.5 py-2.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Phone Contact</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3.5 py-2.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Base Salary / Basic Pay</label>
                  <input
                    type="number"
                    value={newBasic}
                    onChange={e => setNewBasic(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* PAN Number & A/C Number (Before Allowances) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">PAN Number</label>
                  <input
                    type="text"
                    value={newPan}
                    onChange={e => setNewPan(e.target.value.toUpperCase())}
                    placeholder="e.g. ABCDE1234F"
                    className="w-full px-3.5 py-2.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono tracking-wider"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">A/C Number</label>
                  <input
                    type="text"
                    value={newBankAccount}
                    onChange={e => setNewBankAccount(e.target.value)}
                    placeholder="e.g. 815801500344"
                    className="w-full px-3.5 py-2.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Allowances Section */}
              <div className="p-3.5 bg-[#080E1C] border border-blue-900/40 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#1E2E4E] pb-1.5">
                  <span className="font-bold text-sky-400 text-xs flex items-center gap-1">
                    Allowances Breakdown
                  </span>
                  <span className="font-mono text-emerald-400 font-bold text-xs">
                    Total: +{(Number(newHra) + Number(newMedical) + Number(newSpecial) + Number(newInternet)).toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1 text-[11px]">House Rent Allowance (HRA)</label>
                    <input
                      type="number"
                      value={newHra}
                      onChange={e => setNewHra(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-medium mb-1 text-[11px]">Medical Allowance</label>
                    <input
                      type="number"
                      value={newMedical}
                      onChange={e => setNewMedical(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-medium mb-1 text-[11px]">Special Allowance</label>
                    <input
                      type="number"
                      value={newSpecial}
                      onChange={e => setNewSpecial(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-medium mb-1 text-[11px]">Internet Allowance</label>
                    <input
                      type="number"
                      value={newInternet}
                      onChange={e => setNewInternet(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Deductions Section */}
              <div className="p-3.5 bg-[#080E1C] border border-rose-900/40 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#1E2E4E] pb-1.5">
                  <span className="font-bold text-rose-400 text-xs flex items-center gap-1">
                    Deductions Breakdown
                  </span>
                  <span className="font-mono text-rose-400 font-bold text-xs">
                    Total: -{(Number(newProfessionalTax) + Number(newPfContribution) + Number(newGroupHealthInsurance)).toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1 text-[11px]">Professional Tax</label>
                    <input
                      type="number"
                      value={newProfessionalTax}
                      onChange={e => setNewProfessionalTax(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-medium mb-1 text-[11px]">Employee PF Contribution</label>
                    <input
                      type="number"
                      value={newPfContribution}
                      onChange={e => setNewPfContribution(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-medium mb-1 text-[11px]">Group Health Insurance</label>
                    <input
                      type="number"
                      value={newGroupHealthInsurance}
                      onChange={e => setNewGroupHealthInsurance(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Live Net Compensation Preview */}
              <div className="p-3 bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-600/40 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-300">Net Compensation (Gross - Deductions):</span>
                <span className="font-mono font-bold text-base text-emerald-400">
                  {(
                    (Number(newBasic) || 0) +
                    (Number(newHra) + Number(newMedical) + Number(newSpecial) + Number(newInternet)) -
                    (Number(newProfessionalTax) + Number(newPfContribution) + Number(newGroupHealthInsurance))
                  ).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-[#131E36] hover:bg-[#1E2E4E] border border-[#203050] text-slate-300 rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Personnel</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import CSV & XLSX Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#080E1C] border border-[#1E2E4E] rounded-3xl shadow-2xl text-white font-sans overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1E293B] px-6 py-4.5 bg-[#0B1528]/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-sky-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">Bulk Import Employees</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#132A4A] border border-blue-700/50 text-sky-300">
                      CSV &amp; XLSX
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Import multiple employee records directly into the database across all browsers.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setParsedEmployees([]);
                  setUploadedFileName('');
                }}
                className="p-2 rounded-xl bg-[#131E36] hover:bg-[#1E2E4E] border border-[#203050] text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              
              {/* Sample Column Names in Comma-Separated Format */}
              <div className="p-4 bg-[#0B1426] border border-[#1E2E4E] rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-sky-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <FileText className="w-4 h-4 text-sky-400" />
                    Sample Column Names (Comma-Separated Format)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('EMP ID, First Name, Last Name, Joining Date, Designation, Department, Phone, Location, Basic Salary, Allowances');
                      showToast('Copied', 'Sample column names copied to clipboard.');
                    }}
                    className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Column Names</span>
                  </button>
                </div>
                <div className="p-3 bg-[#060A14] border border-[#15223A] rounded-xl overflow-x-auto">
                  <code className="text-[#00E5FF] font-mono text-xs font-semibold block whitespace-nowrap">
                    EMP ID, First Name, Last Name, Joining Date, Designation, Department, Phone, Location, Basic Salary, Allowances
                  </code>
                </div>
              </div>

              {/* Hidden Native File Input */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* CSV or XLSX Spreadsheet Upload Area & Button */}
              <div className="p-6 bg-[#0B1426] border-2 border-dashed border-[#1E3A6E] hover:border-blue-500 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-sky-400">
                  <FileUp className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Select a CSV or XLSX Spreadsheet from your Device</h4>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Supports Excel (.xlsx, .xls) and CSV (.csv) files.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/40 transition-all cursor-pointer flex items-center gap-2 text-xs"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import CSV or XLSX File</span>
                </button>

                {uploadedFileName && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 font-mono text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Loaded: {uploadedFileName}</span>
                  </div>
                )}
              </div>

              {/* 3. Parsed Records Preview Table */}
              {parsedEmployees.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-[#1E293B]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Previewing {parsedEmployees.length} Employee Records (Ready to Save)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Click &quot;Save Changes&quot; below to write records to the database.
                    </span>
                  </div>

                  <div className="border border-[#1E2E4E] rounded-2xl overflow-hidden bg-[#070D1D] max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="sticky top-0 bg-[#0A1224] text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-[#1E293B]">
                        <tr>
                          <th className="py-2 px-3">EMP ID</th>
                          <th className="py-2 px-3">Name</th>
                          <th className="py-2 px-3">Joining Date</th>
                          <th className="py-2 px-3">Designation</th>
                          <th className="py-2 px-3">Department</th>
                          <th className="py-2 px-3">Phone</th>
                          <th className="py-2 px-3">Location</th>
                          <th className="py-2 px-3 text-right">Basic Salary</th>
                          <th className="py-2 px-3 text-right">Allowances</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#131E36] font-mono text-slate-300">
                        {parsedEmployees.map((emp, idx) => (
                          <tr key={emp.id || idx} className="hover:bg-[#0D182E]/60 transition-colors">
                            <td className="py-2 px-3 font-bold text-sky-400">{emp.id}</td>
                            <td className="py-2 px-3 font-sans font-semibold text-white">
                              {emp.firstName} {emp.lastName}
                            </td>
                            <td className="py-2 px-3">{emp.joiningDate}</td>
                            <td className="py-2 px-3 font-sans">{emp.designation}</td>
                            <td className="py-2 px-3 font-sans">
                              <span className="px-2 py-0.5 rounded-md bg-[#132038] text-sky-300 text-[10px]">
                                {emp.department}
                              </span>
                            </td>
                            <td className="py-2 px-3">{emp.phone}</td>
                            <td className="py-2 px-3 font-sans">{emp.location}</td>
                            <td className="py-2 px-3 text-right text-emerald-400 font-bold">
                              Rs. {(emp.compensation.basic || 0).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right text-sky-400 font-bold">
                              Rs. {(emp.compensation.allowances || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer with "Save Changes" Button */}
            <div className="flex items-center justify-between border-t border-[#1E293B] px-6 py-4 bg-[#0B1528]/70">
              <div className="text-xs text-slate-400">
                {parsedEmployees.length > 0 ? (
                  <span className="text-emerald-300 font-medium">
                    ✓ {parsedEmployees.length} employees ready to commit to database
                  </span>
                ) : (
                  <span>Import a CSV or XLSX file above to preview records</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setParsedEmployees([]);
                    setUploadedFileName('');
                  }}
                  className="px-4 py-2 bg-[#131E36] hover:bg-[#1E2E4E] border border-[#203050] text-slate-300 rounded-xl font-semibold transition-colors cursor-pointer text-xs"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveBulkChanges}
                  disabled={isSavingBulk || parsedEmployees.length === 0}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-blue-900/40 transition-all cursor-pointer flex items-center gap-2 text-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {isSavingBulk
                      ? 'Saving to Database...'
                      : parsedEmployees.length > 0
                      ? `Save Changes (${parsedEmployees.length})`
                      : 'Save Changes'}
                  </span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#080E1C] border border-[#1E2E4E] rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 text-white font-sans">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Delete Employee Record</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{employeeToDelete.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEmployeeToDelete(null)}
                className="p-1.5 rounded-xl bg-[#131E36] hover:bg-[#1E2E4E] border border-[#203050] text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete the personnel record for{' '}
                <strong className="text-white">
                  {[employeeToDelete.firstName, employeeToDelete.lastName].filter(Boolean).join(' ') || employeeToDelete.email || employeeToDelete.id}
                </strong>
                ?
              </p>

              <div className="p-3 bg-[#0B132B] rounded-xl border border-[#1E2E4E] space-y-1.5 font-mono text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>EMP ID:</span>
                  <span className="text-sky-300 font-bold">{employeeToDelete.id}</span>
                </div>
                {employeeToDelete.email && (
                  <div className="flex justify-between">
                    <span>Email:</span>
                    <span className="text-slate-200">{employeeToDelete.email}</span>
                  </div>
                )}
                {employeeToDelete.designation && (
                  <div className="flex justify-between">
                    <span>Designation:</span>
                    <span className="text-slate-200">{employeeToDelete.designation}</span>
                  </div>
                )}
                {employeeToDelete.department && (
                  <div className="flex justify-between">
                    <span>Department:</span>
                    <span className="text-slate-200">{employeeToDelete.department}</span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-rose-300/80">
                This record will be immediately removed from the Employee Master directory.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setEmployeeToDelete(null)}
                className="px-4 py-2 bg-[#131E36] hover:bg-[#1E2E4E] border border-[#203050] text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteEmployee}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-950/50 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Employee</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
