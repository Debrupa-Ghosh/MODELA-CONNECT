import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const { users, loginAs, submitSignupRequest, currentUser } = useAuth();
  const { showToast } = useApp();
  const navigate = useNavigate();

  // Steps matching original site:
  // 'STEP_1_LANDING' -> Welcome to Modela Connect with Sign in with Google button
  // 'STEP_2_EMAIL_INPUT' -> Give your email id, Submit Request, Back
  // 'STEP_3_WAITING' -> Request Sent, Status: Pending
  const [step, setStep] = useState<'STEP_1_LANDING' | 'STEP_2_EMAIL_INPUT' | 'STEP_3_WAITING'>('STEP_1_LANDING');

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated in this active session, forward to dashboard
  React.useEffect(() => {
    if (currentUser && currentUser.status === 'APPROVED') {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, navigate]);

  // Real-time sync across devices: while actively waiting on STEP_3_WAITING, as soon as Admin accepts the request,
  // the live Firestore snapshot updates users, which immediately logs this session in!
  React.useEffect(() => {
    if (step !== 'STEP_3_WAITING') return;
    const savedPending = localStorage.getItem('modela_pending_signup_email');
    const waitingEmail = email || savedPending;
    if (!waitingEmail) return;
    const clean = waitingEmail.trim().toLowerCase();

    const matched = users.find(u => u.email?.toLowerCase() === clean);
    if (matched && matched.status === 'APPROVED') {
      try {
        localStorage.removeItem('modela_pending_signup_email');
      } catch {}
      const ok = loginAs(clean);
      if (ok) {
        showToast('Access Approved', `Welcome ${matched.name || 'Staff'}! Your sign-up request has been accepted.`);
        navigate('/dashboard', { replace: true });
      }
    }
  }, [users, email, step, loginAs, navigate, showToast]);

  const handleGoogleClick = () => {
    setErrorMsg('');
    setStep('STEP_2_EMAIL_INPUT');
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      // 1. Check if user already exists in the active directory
      const existing = users.find(u => u.email.toLowerCase() === cleanEmail);

      if (existing) {
        if (existing.status === 'APPROVED') {
          try {
            localStorage.removeItem('modela_pending_signup_email');
          } catch {}
          const success = loginAs(cleanEmail);
          if (success) {
            navigate('/dashboard', { replace: true });
            return;
          }
        } else if (existing.status === 'PENDING') {
          // Status is PENDING -> Show Request Sent (Status: Pending)
          try {
            localStorage.setItem('modela_pending_signup_email', cleanEmail);
          } catch {}
          setStep('STEP_3_WAITING');
          return;
        }
      }

      // Direct Instant Access for default Super Admin Modela Tech if not in pending flow
      if (cleanEmail === 'modelatech2026@gmail.com') {
        try {
          localStorage.removeItem('modela_pending_signup_email');
        } catch {}
        const ok = loginAs(cleanEmail);
        if (ok) {
          navigate('/dashboard', { replace: true });
          return;
        }
      }

      // If new sign up request (including a previously deleted user re-requesting access), require full name
      if (!cleanName) {
        setErrorMsg('Please enter your full name.');
        return;
      }

      // 2. Submit sign-up request -> Queued for review, transitions to STEP_3_WAITING!
      try {
        localStorage.setItem('modela_pending_signup_email', cleanEmail);
      } catch {}

      const res = submitSignupRequest({
        email: cleanEmail,
        name: cleanName
      });

      if (res.success) {
        if (res.isPending === false && res.user?.status === 'APPROVED') {
          const ok = loginAs(cleanEmail);
          if (ok) {
            navigate('/dashboard', { replace: true });
            return;
          }
        }
        setStep('STEP_3_WAITING');
      } else {
        setErrorMsg(res.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="min-h-screen bg-[#070D1D] text-slate-100 flex items-center justify-center p-4 antialiased font-sans selection:bg-blue-600/30">
      {/* STEP 1: WELCOME TO MODELA CONNECT (MATCHES IMAGE 1 WITH ONE LINE TITLE & NO QUICK ROLES) */}
      {step === 'STEP_1_LANDING' && (
        <div className="w-full max-w-lg bg-[#111A2E] border border-[#1E2D48] rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight whitespace-nowrap">
              Welcome to Modela Connect
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Enterprise Workforce Management Platform
            </p>
          </div>

          <button
            onClick={handleGoogleClick}
            className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 font-medium rounded-xl flex items-center justify-center gap-3 text-base transition-colors shadow-sm cursor-pointer mt-6"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.1 8.9 5 12 5z" />
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
              <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.6 7.2C.6 9.2 0 11.2 0 13.5s.6 4.3 1.6 6.3l3.7-2.9z" />
              <path fill="#34A853" d="M12 23c3.2 0 6.1-1.1 8.2-3.1l-3.7-2.9c-1.1.7-2.5 1.2-4.5 1.2-3.1 0-5.8-2.1-6.7-5.1L1.6 16c1.9 3.8 5.8 7 10.4 7z" />
            </svg>
            <span className="font-semibold text-slate-900">Sign in with Google</span>
          </button>
        </div>
      )}

      {/* STEP 2: GIVE YOUR EMAIL ID */}
      {step === 'STEP_2_EMAIL_INPUT' && (
        <div className="w-full max-w-md bg-[#111A2E] border border-[#1E2D48] rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.1 8.9 5 12 5z" />
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
              <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.6 7.2C.6 9.2 0 11.2 0 13.5s.6 4.3 1.6 6.3l3.7-2.9z" />
              <path fill="#34A853" d="M12 23c3.2 0 6.1-1.1 8.2-3.1l-3.7-2.9c-1.1.7-2.5 1.2-4.5 1.2-3.1 0-5.8-2.1-6.7-5.1L1.6 16c1.9 3.8 5.8 7 10.4 7z" />
            </svg>
            <h2 className="text-xl font-bold text-white tracking-tight">Sign in with Google</h2>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="user-fullname-input" className="block text-sm font-semibold text-slate-200 mb-2">
                Enter full Name
              </label>
              <input
                id="user-fullname-input"
                type="text"
                autoFocus
                placeholder="e.g. Aditi Chakraborty"
                value={fullName}
                onChange={e => {
                  setFullName(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                className="w-full px-4 py-3 bg-[#0B132B] border border-blue-500/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label htmlFor="user-email-input" className="block text-sm font-semibold text-slate-200 mb-2">
                Give your email id
              </label>
              <input
                id="user-email-input"
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                className="w-full px-4 py-3 bg-[#0B132B] border border-blue-500 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              {errorMsg && (
                <p className="text-rose-400 text-xs mt-1.5">{errorMsg}</p>
              )}
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? 'Submitting...' : 'Submit Request'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setFullName('');
                  setStep('STEP_1_LANDING');
                }}
                className="w-full py-2 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors cursor-pointer text-center block"
              >
                Back
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 3: WAITING FOR ADMIN APPROVAL (EXACT MATCH WITH REFERENCE IMAGE) */}
      {step === 'STEP_3_WAITING' && (
        <div className="w-full max-w-[440px] bg-[#111A2E] border border-[#1E2D48] rounded-3xl p-8 sm:p-10 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-150">
          {/* Status: Pending Badge */}
          <div className="inline-flex items-center justify-center px-4 py-1 rounded-full text-xs sm:text-sm font-semibold border border-[#B45309] text-[#F59E0B] bg-[#1F1404] select-none">
            Status: Pending
          </div>

          {/* Heading */}
          <h2 className="text-3xl font-extrabold text-white tracking-tight mt-6 mb-3">
            Request Sent
          </h2>

          {/* Subtext */}
          <p className="text-slate-300 text-sm sm:text-[15px] leading-relaxed max-w-[300px] mx-auto mb-8">
            Your request has been sent to the HR Admin. Please wait for approval.
          </p>

          {/* Single Back to Login Button */}
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.removeItem('modela_pending_signup_email');
              } catch {}
              setErrorMsg('');
              setEmail('');
              setFullName('');
              setStep('STEP_1_LANDING');
            }}
            className="w-full py-3.5 px-4 bg-[#1E2D4A] hover:bg-[#25375A] active:bg-[#18253E] text-white font-medium rounded-xl text-sm sm:text-base transition-colors cursor-pointer shadow-sm"
          >
            Back to Login
          </button>
        </div>
      )}
    </div>
  );
};
