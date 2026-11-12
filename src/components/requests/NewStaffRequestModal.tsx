import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { StaffRequestType, MentionedUser, getRoleLabel } from '../../types';
import { Send, ChevronDown, AtSign, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NewStaffRequestModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { addStaffRequest, showToast } = useApp();
  const { currentUser, approvedUsers } = useAuth();

  const [requestType, setRequestType] = useState<string>('Sick Leave');
  const [toInput, setToInput] = useState<string>('');
  const [selectedToUsers, setSelectedToUsers] = useState<MentionedUser[]>([]);
  const [showToDropdown, setShowToDropdown] = useState<boolean>(false);
  const [toHighlightIdx, setToHighlightIdx] = useState<number>(0);

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [requestDate, setRequestDate] = useState('');
  const [bucketHolidayDate, setBucketHolidayDate] = useState<string>('11/11/2026');
  const [detailedExplanation, setDetailedExplanation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toInputRef = useRef<HTMLInputElement | null>(null);

  // Active users from Approved Users Directory tab of User Management Page
  const directoryUsers = useMemo<MentionedUser[]>(() => {
    const map = new Map<string, MentionedUser>();
    approvedUsers.forEach(u => {
      if (!u || !u.email) return;
      const emailLower = u.email.toLowerCase().trim();
      const empIdUpper = (u.employeeId || '').toUpperCase().trim();
      const displayName =
        emailLower === 'poulamim@modelatech.com' || empIdUpper === 'MTK017'
          ? 'Poulami Manna'
          : (u.name || '').trim();
      if (!displayName) return;
      map.set(emailLower, {
        id: u.id,
        name: displayName,
        email: u.email,
        employeeId: u.employeeId,
        role: u.role
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [approvedUsers]);

  // Extract current @mention query being typed at the end of an input string
  const extractActiveMentionQuery = (val: string): { hasAt: boolean; query: string; prefixBeforeAt: string } => {
    const lastAtIdx = val.lastIndexOf('@');
    if (lastAtIdx === -1) {
      return { hasAt: false, query: val.trim(), prefixBeforeAt: '' };
    }
    const afterAt = val.slice(lastAtIdx + 1);
    // If there is a comma after the last @, the user already finished that token
    if (afterAt.includes(',')) {
      return { hasAt: false, query: '', prefixBeforeAt: val };
    }
    return {
      hasAt: true,
      query: afterAt.trimStart(),
      prefixBeforeAt: val.slice(0, lastAtIdx)
    };
  };

  // Case-insensitive matching against Approved Users Directory names
  const getMatchingDirectoryUsers = (rawInput: string, alreadySelected: MentionedUser[]): MentionedUser[] => {
    const { hasAt, query } = extractActiveMentionQuery(rawInput);
    if (!hasAt && !query) return [];
    const cleanQ = query.toLowerCase().replace(/^@+/, '').trim();
    const selectedEmails = new Set(alreadySelected.map(u => u.email.toLowerCase().trim()));

    const matches = directoryUsers.filter(u => {
      if (selectedEmails.has(u.email.toLowerCase().trim())) return false;
      if (!cleanQ) return true; // Just typed '@' -> show all active directory users
      const nameLower = u.name.toLowerCase();
      const words = nameLower.split(/\s+/);
      return (
        nameLower.includes(cleanQ) ||
        words.some(w => w.startsWith(cleanQ))
      );
    });

    // Prioritize users whose full name or first name starts with the query (case-insensitive)
    return matches.sort((a, b) => {
      if (!cleanQ) return a.name.localeCompare(b.name);
      const aLower = a.name.toLowerCase();
      const bLower = b.name.toLowerCase();
      const aStarts = aLower.startsWith(cleanQ) ? 0 : 1;
      const bStarts = bLower.startsWith(cleanQ) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.name.localeCompare(b.name);
    });
  };

  const toSuggestions = useMemo(
    () => getMatchingDirectoryUsers(toInput, selectedToUsers),
    [toInput, selectedToUsers, directoryUsers]
  );

  // Resolve any @name tokens in text case-insensitively against Approved Users Directory
  const resolveMentionsFromText = (rawText: string, existingSelected: MentionedUser[]): { users: MentionedUser[]; formattedText: string } => {
    const resultMap = new Map<string, MentionedUser>();
    existingSelected.forEach(u => {
      resultMap.set(u.email.toLowerCase().trim(), u);
    });

    // Split by '@' or ',' to extract candidate name tokens
    const rawTokens = rawText
      .split(/[,@]/)
      .map(s => s.trim())
      .filter(Boolean);

    rawTokens.forEach(token => {
      const lowerToken = token.toLowerCase();
      // 1. Exact full name match (case-insensitive)
      let matched = directoryUsers.find(u => u.name.toLowerCase() === lowerToken);
      // 2. Exact first name match or startsWith match (case-insensitive)
      if (!matched) {
        matched = directoryUsers.find(u => {
          const parts = u.name.toLowerCase().split(/\s+/);
          return parts[0] === lowerToken || u.name.toLowerCase().startsWith(lowerToken);
        });
      }
      // 3. Substring name match (case-insensitive)
      if (!matched) {
        matched = directoryUsers.find(u => u.name.toLowerCase().includes(lowerToken));
      }
      if (matched) {
        resultMap.set(matched.email.toLowerCase().trim(), matched);
      }
    });

    const finalUsers = Array.from(resultMap.values());
    const formattedText = finalUsers.map(u => `@${u.name}`).join(', ');
    return { users: finalUsers, formattedText };
  };

  const handleSelectMention = (user: MentionedUser) => {
    const exists = selectedToUsers.some(u => u.email.toLowerCase() === user.email.toLowerCase());
    const nextList = exists ? selectedToUsers : [...selectedToUsers, user];
    setSelectedToUsers(nextList);
    setToInput('');
    setShowToDropdown(false);
    setToHighlightIdx(0);
    toInputRef.current?.focus();
  };

  const handleRemoveMention = (email: string) => {
    const cleanEmail = email.toLowerCase().trim();
    setSelectedToUsers(prev => prev.filter(u => u.email.toLowerCase().trim() !== cleanEmail));
  };

  const handleInputChange = (val: string) => {
    // Check if the user typed an exact @FullName (case-insensitive) from Approved Users Directory; if so, auto-take it immediately
    const { hasAt, query } = extractActiveMentionQuery(val);
    const cleanQ = query.toLowerCase().replace(/^@+/, '').trim();
    if (hasAt && cleanQ) {
      const exactFullMatch = directoryUsers.find(u => u.name.toLowerCase() === cleanQ);
      if (exactFullMatch) {
        handleSelectMention(exactFullMatch);
        return;
      }
    }

    setToInput(val);
    setShowToDropdown(val.trim().length > 0);
    setToHighlightIdx(0);
  };

  const handleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    suggestions: MentionedUser[],
    highlightIdx: number,
    setHighlightIdx: React.Dispatch<React.SetStateAction<number>>,
    currentInputVal: string
  ) => {
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setHighlightIdx(prev => (prev + 1) % suggestions.length);
      return;
    }
    if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      setHighlightIdx(prev => (prev - 1 + suggestions.length) % suggestions.length);
      return;
    }
    if ((e.key === 'Enter' || e.key === 'Tab' || e.key === ',') && currentInputVal.trim()) {
      if (suggestions.length > 0) {
        e.preventDefault();
        const chosen = suggestions[highlightIdx] || suggestions[0];
        handleSelectMention(chosen);
        return;
      }
    }
    if (e.key === 'Backspace' && !currentInputVal) {
      if (selectedToUsers.length > 0) {
        setSelectedToUsers(prev => prev.slice(0, -1));
      }
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setShowToDropdown(false);
      if (toInput.trim()) {
        const { users } = resolveMentionsFromText(toInput, selectedToUsers);
        setSelectedToUsers(users);
        setToInput('');
      }
    }, 180);
  };

  if (!isOpen) return null;

  const isLeaveDateRangeRequest = [
    'Sick Leave',
    'Privilege Leave',
    'Maternity Leave',
    'Paternity Leave'
  ].includes(requestType);
  const isBucketHoliday = requestType === 'Bucket Holiday';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Validation Error', 'Please enter a Title / Subject for the request.', 'error');
      return;
    }

    if (isLeaveDateRangeRequest) {
      if (!startDate || !endDate) {
        showToast('Validation Error', 'Please select both Start Date and End Date from the calendar.', 'error');
        return;
      }
      if (new Date(endDate) < new Date(startDate)) {
        showToast('Validation Error', 'End Date cannot be earlier than Start Date.', 'error');
        return;
      }
    } else if (isBucketHoliday) {
      if (!bucketHolidayDate) {
        showToast('Validation Error', 'Please select a Date from the dropdown.', 'error');
        return;
      }
    } else {
      if (!requestDate) {
        showToast('Validation Error', 'Please select a Date from the calendar.', 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Resolve any remaining typed @name in To input case-insensitively
      const resolvedTo = toInput.trim()
        ? resolveMentionsFromText(toInput, selectedToUsers)
        : { users: selectedToUsers, formattedText: selectedToUsers.map(u => `@${u.name}`).join(', ') };

      // Map user friendly type to StaffRequestType enum
      let mappedType: StaffRequestType = 'LEAVE';
      if (requestType.includes('Expense')) mappedType = 'EXPENSE';
      else if (requestType.includes('Equipment') || requestType.includes('Hardware')) mappedType = 'EQUIPMENT';
      else if (requestType.includes('Shift')) mappedType = 'SHIFT';
      else if (requestType.includes('Travel')) mappedType = 'TRAVEL';
      else if (requestType.includes('Access')) mappedType = 'ACCESS_CLEARANCE';
      else if (requestType.includes('Training')) mappedType = 'TRAINING';

      const empId = currentUser?.employeeId || 'MOD001';
      const empName = currentUser?.name || 'Sushoovan Das';
      const empEmail = currentUser?.email || 'sushovand@modelatech.com';
      const empDept = currentUser?.department || 'Executive Office';
      const empDesignation = currentUser?.designation || 'Staff / Super Admin';

      const formattedDates = isLeaveDateRangeRequest
        ? `${startDate} to ${endDate}`
        : isBucketHoliday
        ? bucketHolidayDate
        : requestDate;

      await addStaffRequest({
        employeeId: empId,
        employeeName: empName,
        employeeEmail: empEmail,
        department: empDept,
        designation: empDesignation,
        type: mappedType,
        subType: requestType,
        title: title.trim(),
        description: detailedExplanation.trim() || `${requestType} requisition filed by ${empName}`,
        amountOrDays: formattedDates,
        targetDates: formattedDates,
        ...(isLeaveDateRangeRequest
          ? { startDate, endDate }
          : { requestDate: isBucketHoliday ? bucketHolidayDate : requestDate }),
        priority: 'MEDIUM',
        justification: detailedExplanation.trim() || 'Administrative request submission',
        supervisorName: resolvedTo.users[0]?.name || 'Alex Morgan',
        to: resolvedTo.formattedText,
        toUsers: resolvedTo.users,
        isLiveStaffRequest: true
      });

      onClose();
      // Reset form
      setToInput('');
      setSelectedToUsers([]);
      setTitle('');
      setStartDate('');
      setEndDate('');
      setRequestDate('');
      setBucketHolidayDate('11/11/2026');
      setDetailedExplanation('');
    } catch {
      showToast('Submission Failed', 'Could not record staff request.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-[#0F172A] border border-[#1E293B] rounded-2xl shadow-2xl p-6 sm:p-7 text-white font-sans space-y-5">
        
        {/* Modal Title */}
        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
          Submit Administrative Request
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* 1. Request Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Request Type
            </label>
            <div className="relative">
              <select
                value={requestType}
                onChange={e => setRequestType(e.target.value)}
                className="w-full bg-[#080E1C] border border-[#1E293B] text-slate-100 rounded-xl pl-3.5 pr-9 py-2.5 text-xs appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition-colors"
              >
                <option value="Sick Leave">Sick Leave</option>
                <option value="Privilege Leave">Privilege Leave</option>
                <option value="Maternity Leave">Maternity Leave</option>
                <option value="Paternity Leave">Paternity Leave</option>
                <option value="Bucket Holiday">Bucket Holiday</option>
                <option value="Expense Reimbursement">Expense Reimbursement</option>
                <option value="Hardware / Equipment Requisition">Hardware / Equipment Requisition</option>
                <option value="Shift / Core Hours Adjustment">Shift / Core Hours Adjustment</option>
                <option value="Business Travel Clearance">Business Travel Clearance</option>
                <option value="Elevated Access Clearance">Elevated Access Clearance</option>
                <option value="Training & Professional Development">Training & Professional Development</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 2. To Mention Input Box (After Request Type) */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              To
            </label>
            <div
              onClick={() => toInputRef.current?.focus()}
              className="w-full min-h-[38px] bg-[#080E1C] border border-[#1E293B] focus-within:ring-1 focus-within:ring-blue-500 rounded-xl px-3.5 py-1.5 flex items-center flex-wrap gap-1.5 cursor-text transition-colors"
            >
              {selectedToUsers.map(u => (
                <span
                  key={u.email}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-950/90 border border-blue-500/50 text-[#38BDF8] text-[11px] font-bold"
                >
                  <span>@{u.name}</span>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleRemoveMention(u.email);
                    }}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                ref={toInputRef}
                type="text"
                value={toInput}
                onFocus={() => {
                  if (toInput.trim()) setShowToDropdown(true);
                }}
                onBlur={handleInputBlur}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={e =>
                  handleInputKeyDown(
                    e,
                    toSuggestions,
                    toHighlightIdx,
                    setToHighlightIdx,
                    toInput
                  )
                }
                placeholder={selectedToUsers.length === 0 ? 'Type @name to mention...' : 'Add @name...'}
                className="flex-1 min-w-[110px] bg-transparent border-0 text-slate-100 placeholder-slate-500 text-xs focus:outline-none py-0.5"
              />
            </div>

            {/* To Autocomplete Dropdown */}
            {showToDropdown && toSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-48 overflow-y-auto bg-[#0B1528] border border-[#1E2E4E] rounded-xl shadow-2xl divide-y divide-[#1E293B]/60">
                {toSuggestions.map((u, idx) => (
                  <button
                    key={u.email}
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault();
                      handleSelectMention(u);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                      idx === toHighlightIdx
                        ? 'bg-blue-600/30 text-white'
                        : 'text-slate-200 hover:bg-[#131E36]'
                    }`}
                  >
                    <div className="truncate">
                      <div className="font-bold text-white flex items-center gap-1">
                        <AtSign className="w-3 h-3 text-[#38BDF8] shrink-0" />
                        <span className="truncate">{u.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">{u.email}</div>
                    </div>
                    <span className="shrink-0 text-[10px] font-mono font-bold text-[#38BDF8] bg-[#080E1C] px-1.5 py-0.5 rounded border border-[#1E293B]">
                      {u.employeeId || getRoleLabel(u.role)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Title / Subject * */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Title / Subject <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Annual Vacation or External Conference Pass"
              className="w-full bg-[#080E1C] border border-[#1E293B] text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* 4. Date Selection */}
          {isLeaveDateRangeRequest ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Start Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  onClick={e => {
                    try {
                      (e.currentTarget as HTMLInputElement).showPicker?.();
                    } catch {}
                  }}
                  className="w-full bg-[#080E1C] border border-[#1E293B] text-slate-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer [color-scheme:dark]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  End Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  min={startDate || undefined}
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  onClick={e => {
                    try {
                      (e.currentTarget as HTMLInputElement).showPicker?.();
                    } catch {}
                  }}
                  className="w-full bg-[#080E1C] border border-[#1E293B] text-slate-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer [color-scheme:dark]"
                />
              </div>
            </div>
          ) : isBucketHoliday ? (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Date <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <select
                  value={bucketHolidayDate}
                  onChange={e => setBucketHolidayDate(e.target.value)}
                  className="w-full bg-[#080E1C] border border-[#1E293B] text-slate-100 rounded-xl pl-3.5 pr-9 py-2.5 text-xs appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition-colors"
                >
                  <option value="11/11/2026">11/11/2026</option>
                  <option value="24/11/2026">24/11/2026</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={requestDate}
                onChange={e => setRequestDate(e.target.value)}
                onClick={e => {
                  try {
                    (e.currentTarget as HTMLInputElement).showPicker?.();
                  } catch {}
                }}
                className="w-full bg-[#080E1C] border border-[#1E293B] text-slate-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer [color-scheme:dark]"
              />
            </div>
          )}

          {/* 5. Detailed Explanation */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Detailed Explanation
            </label>
            <textarea
              rows={4}
              value={detailedExplanation}
              onChange={e => setDetailedExplanation(e.target.value)}
              placeholder="Provide context for managerial evaluation..."
              className="w-full bg-[#080E1C] border border-[#1E293B] text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none transition-colors"
            />
          </div>

          {/* Footer Buttons */}
          <div className="border-t border-[#1E293B] pt-4 mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-[#202D44] hover:bg-[#2B3C5A] text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

