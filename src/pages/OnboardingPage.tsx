import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  Plus,
  UserCheck,
  Building,
  CheckCircle2,
  X
} from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const { onboarding, showToast } = useApp();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [dept, setDept] = useState('Engineering');

  const handleStartOnboard = (e: React.FormEvent) => {
    e.preventDefault();
    setCandidates(prev => [
      ...prev,
      {
        id: `ONB-${Date.now()}`,
        name,
        role,
        department: dept,
        progress: 25,
        stage: 'DOCUMENTS_PENDING'
      }
    ]);
    setIsModalOpen(false);
    setName('');
    setRole('');
    showToast('Onboarding Candidate Added', `${name} initiated in onboarding pipeline.`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto antialiased font-sans text-white">
      {/* Header (Dark Navy Box matching Image) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1528] p-6 rounded-2xl border border-[#1E2E4E] shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Talent Onboarding
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-950/80 text-sky-300 border border-blue-800">
              {candidates.length} In Progress
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Track onboarding milestones for newly registered employees entering the master roster.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Onboard New Employee</span>
        </button>
      </div>

      {/* Main Empty Pipeline Card (Matches Image 5) */}
      {candidates.length === 0 ? (
        <div className="p-16 text-center bg-[#0B132B] rounded-2xl border border-slate-800/80 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-950/80 text-sky-400 flex items-center justify-center">
            <Users className="w-7 h-7" />
          </div>

          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-200">
              Onboarding Pipeline Clear
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              All active personnel have completed onboarding. Register a new candidate to create an entry directly in Employee Master.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Start Onboarding</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {candidates.map(c => (
            <div key={c.id} className="p-5 bg-[#0B132B] border border-[#1E293B] rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">{c.name}</h3>
                  <p className="text-xs text-slate-400">{c.role} • {c.department}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-blue-950 text-sky-400 border border-blue-800 font-bold">
                  {c.stage}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Progress</span>
                  <span className="text-sky-400 font-bold">{c.progress}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${c.progress}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#0D182E] border border-[#1E2E4E] rounded-2xl p-6 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-[#1E2E4E] pb-3">
              <h2 className="font-bold text-sm">Initiate Onboarding Pipeline</h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-white" />
              </button>
            </div>
            <form onSubmit={handleStartOnboard} className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-slate-300">Candidate Name</label>
                <input
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Priyanshu Roy"
                  className="w-full p-2.5 rounded-xl bg-[#070D1D] border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold text-slate-300">Target Role</label>
                <input
                  required
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  placeholder="e.g. Structural BIM Specialist"
                  className="w-full p-2.5 rounded-xl bg-[#070D1D] border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold text-slate-300">Department</label>
                <select
                  value={dept}
                  onChange={e => setDept(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#070D1D] border border-slate-700 text-white"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Product Design">Product Design</option>
                  <option value="Quality Assurance">Quality Assurance</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold"
                >
                  Register in Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
