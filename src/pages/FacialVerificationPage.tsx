import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ScanFace,
  CheckCircle2,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export const FacialVerificationPage: React.FC = () => {
  const { employees, logAttendance } = useApp();
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || '');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    name: string;
    id: string;
    confidence: number;
    timestamp: string;
  } | null>(null);

  const selectedEmp = employees.find(e => e.id === selectedEmpId) || employees[0];

  const handleSimulateScan = () => {
    if (!selectedEmp) return;
    setIsScanning(true);
    setScanResult(null);

    setTimeout(async () => {
      setIsScanning(false);
      const res = await logAttendance(selectedEmp.id, 'FACIAL_AI');
      const confidence = +(98.0 + Math.random() * 1.8).toFixed(1);

      setScanResult({
        success: res.success,
        name: `${selectedEmp.firstName} ${selectedEmp.lastName}`,
        id: selectedEmp.id,
        confidence,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }, 2200);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto antialiased font-sans text-white">
      {/* Header (Dark Navy Box matching Image) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1528] p-6 rounded-2xl border border-[#1E2E4E] shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Facial AI Verification Kiosk
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Neural Mesh v4.8
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Contactless biometric identity recognition sensor. Automated timestamp verification and anti-spoofing engine.
          </p>
        </div>
      </div>

      {/* Main Kiosk Viewfinder */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-[#080E1C] rounded-3xl border border-[#1E293B] p-6 flex flex-col items-center justify-center relative min-h-[420px] overflow-hidden shadow-2xl">
          {/* Subtle cyber background grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />

          {/* Viewfinder Reticle */}
          <div className="relative w-64 h-72 sm:w-72 sm:h-80 border-2 border-emerald-500/40 rounded-3xl flex items-center justify-center p-4">
            {/* Corner crosshairs */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-emerald-400" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-emerald-400" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-emerald-400" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-emerald-400" />

            {/* Scanning line animation */}
            {isScanning && (
              <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-bounce" />
            )}

            {/* Target Avatar or Face Mesh */}
            <div className="relative flex flex-col items-center">
              <div className="w-36 h-36 rounded-full overflow-hidden border-2 border-emerald-500/60 shadow-xl shadow-emerald-500/20 relative">
                <img
                  src={selectedEmp?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedEmp?.firstName + ' ' + selectedEmp?.lastName)}&background=0284c7&color=fff`}
                  alt=""
                  className="w-full h-full object-cover"
                />
                {isScanning && (
                  <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-2xs flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-emerald-300 animate-spin" />
                  </div>
                )}
              </div>

              <span className="font-mono text-xs font-bold text-emerald-400 mt-3 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                {selectedEmp?.firstName} {selectedEmp?.lastName} ({selectedEmp?.id})
              </span>
            </div>
          </div>

          {/* Trigger Scan Button */}
          <div className="mt-6 z-10">
            <button
              disabled={isScanning}
              onClick={handleSimulateScan}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#22C55E] to-[#16a34a] hover:from-[#16a34a] text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ScanFace className="w-4 h-4" />
              <span>{isScanning ? 'Analyzing Facial Biometrics...' : 'Authenticate & Log Check-In'}</span>
            </button>
          </div>
        </div>

        {/* Configuration & Verification Output (Dark Navy Boxes) */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#0B1528] border border-[#1E293B] shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-white">
              Target Employee Selector
            </h3>
            <p className="text-xs text-slate-400">
              Select which verified employee's biometric credentials to simulate before the kiosk optical sensor:
            </p>
            <select
              value={selectedEmpId}
              onChange={e => setSelectedEmpId(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#060B18] border border-[#1E293B] text-white font-medium text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.id} - {emp.department})
                </option>
              ))}
            </select>
          </div>

          {/* Verification Result Card */}
          {scanResult && (
            <div className="p-5 rounded-2xl bg-[#0B1528] border border-emerald-500/50 shadow-xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Biometric Match Confirmed</span>
              </div>
              <div className="space-y-1 font-mono text-xs">
                <p className="text-slate-200">
                  Attendee: <strong className="text-white">{scanResult.name}</strong>
                </p>
                <p className="text-slate-200">
                  ID: <strong className="text-white">{scanResult.id}</strong>
                </p>
                <p className="text-slate-200">
                  Match Confidence: <strong className="text-emerald-400">{scanResult.confidence}%</strong>
                </p>
                <p className="text-slate-200">
                  Timestamp: <strong className="text-white">{scanResult.timestamp}</strong>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
