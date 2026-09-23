// Bidder Login page — ported from the Stitch screen
// "CPCL e-Procurement Portal - Bidder Login" (project: GeM Portal).
//
// Source of truth: Stitch project 6921642772921774119, screen
// eebc689107a04f70899f1b4b11c3f406. Ported as closely as possible to the
// generated HTML/Tailwind/Font Awesome markup. The Stitch prototype's
// inline <script> state-switcher (showState/togglePassword) is reimplemented
// as React state below instead of DOM manipulation.
//
// TODO: replace the "UI Preview State" demo switcher and mock submit handler
// with a real submission to features/auth/api once POST /api/auth/login is
// implemented on the gateway. TODO: wire "Online Bidder Enrollment" and
// "Forgot Password" links to their own routes/pages when built.

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

type LoginState = 'default' | 'invalid-cred' | 'invalid-captcha' | 'locked' | 'success';

const STATE_BUTTONS: { id: LoginState; label: string }[] = [
  { id: 'default', label: 'Normal' },
  { id: 'invalid-cred', label: 'Invalid Creds' },
  { id: 'invalid-captcha', label: 'Bad Captcha' },
  { id: 'locked', label: 'Locked' },
  { id: 'success', label: 'Success' },
];

export function LoginPage() {
  const [state, setState] = useState<LoginState>('default');
  const [showPassword, setShowPassword] = useState(false);
  const formDisabled = state === 'locked' || state === 'success';
  const navigate = useNavigate();

  // Mirrors the Stitch success state's "Redirecting to Bidder Dashboard..."
  // copy. TODO: replace with a redirect driven by the real auth response
  // once POST /api/auth/login exists on the gateway.
  useEffect(() => {
    if (state !== 'success') return;
    const timer = setTimeout(() => navigate('/dashboard'), 1500);
    return () => clearTimeout(timer);
  }, [state, navigate]);

  return (
    <div className="min-h-screen flex flex-col justify-between antialiased bg-govBg text-govText font-sans">
      {/* 1. TOP GOVERNMENT BAR */}
      <div>
        <div className="bg-[#0B1F3A] text-white text-xs border-b border-white/10 px-4 sm:px-8 py-1.5 flex flex-wrap justify-between items-center tracking-wide">
          <div className="flex items-center space-x-3">
            <span className="font-medium text-slate-200">भारत सरकार | Government of India</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300">पेट्रोलियम और प्राकृतिक गैस मंत्रालय | Ministry of Petroleum &amp; Natural Gas</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px] text-slate-300">
            <a href="#main-content" className="hover:text-white transition focus:outline-none focus:ring-1 focus:ring-amber-400">
              Skip to Main Content
            </a>
            <span>|</span>
            <a href="#" className="hover:text-white transition focus:outline-none focus:ring-1 focus:ring-amber-400">
              <i className="fa-solid fa-universal-access mr-1"></i> Screen Reader Access
            </a>
            <span>|</span>
            <div className="flex items-center space-x-1 font-mono text-[10px]">
              <button className="px-1 bg-slate-800 rounded hover:bg-slate-700">A-</button>
              <button className="px-1 bg-slate-800 rounded hover:bg-slate-700">A</button>
              <button className="px-1 bg-slate-800 rounded hover:bg-slate-700">A+</button>
            </div>
            <span>|</span>
            <div className="space-x-1.5 font-medium">
              <span className="text-amber-400 font-semibold">English</span>
              <span className="text-slate-500">|</span>
              <a href="#" className="hover:text-white">हिन्दी</a>
              <span className="text-slate-500">|</span>
              <a href="#" className="hover:text-white">தமிழ்</a>
            </div>
          </div>
        </div>

        {/* 2. MAIN HEADER */}
        <header className="bg-white border-b border-[#D6D9DE] px-4 sm:px-8 py-3.5 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded bg-[#12355B] text-white flex flex-col items-center justify-center font-bold tracking-tight shadow-sm border border-[#0B1F3A]">
                <span className="text-sm leading-none font-black tracking-widest text-amber-400">CPCL</span>
                <span className="text-[8px] text-slate-300 uppercase scale-90">Chennai</span>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold tracking-tight text-[#12355B]">e-Procurement Portal</h1>
                  <span className="bg-[#EFF6FF] text-[#1A5AA6] border border-[#BFDBFE] text-[10px] font-semibold px-2 py-0.5 rounded tracking-wide uppercase">
                    SIH 2026 Prototype
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium">Chennai Petroleum Corporation Limited (A Government of India Enterprise)</p>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-xs text-slate-600">
              <div className="hidden lg:flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
                <i className="fa-regular fa-clock text-[#1A5AA6]"></i>
                <div>
                  <span className="text-[10px] text-slate-500 block leading-tight font-medium">IST Server Time:</span>
                  <span className="font-mono text-xs font-semibold text-slate-800">27-Feb-2025 | 11:45:20 IST</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <a href="#" className="text-slate-600 hover:text-[#1A5AA6] font-medium flex items-center space-x-1.5">
                  <i className="fa-regular fa-circle-question"></i>
                  <span>Help &amp; Support</span>
                </a>
                <span className="text-slate-300">|</span>
                <div className="text-[11px] text-slate-500">
                  Helpline: <span className="font-bold text-slate-800">1800-425-7800</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 3. PRIMARY NAVIGATION */}
        <nav className="bg-[#12355B] text-white text-xs border-b border-[#0B1F3A] px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-1 overflow-x-auto py-1">
              <Link to="/" className="px-3.5 py-2 font-medium hover:bg-white/10 rounded flex items-center space-x-1.5 text-slate-200">
                <i className="fa-solid fa-house text-xs"></i>
                <span>Home</span>
              </Link>
              <a href="#" className="px-3 py-2 font-medium hover:bg-white/10 rounded text-slate-200">Tenders</a>
              <a href="#" className="px-3 py-2 font-medium hover:bg-white/10 rounded text-slate-200">Corrigendum</a>
              <a href="#" className="px-3 py-2 font-medium hover:bg-white/10 rounded text-slate-200">Tender Notices</a>
              <a href="#" className="px-3 py-2 font-medium hover:bg-white/10 rounded text-slate-200">Downloads</a>
              <a href="#" className="px-3 py-2 font-medium hover:bg-white/10 rounded text-slate-200">Help</a>
              <a href="#" className="px-3 py-2 font-medium hover:bg-white/10 rounded text-slate-200">Contact Us</a>
            </div>
            <div className="hidden sm:flex items-center space-x-2 text-[11px] text-slate-300 pr-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Sovereign PKI Encryption Enabled</span>
            </div>
          </div>
        </nav>

        {/* Advisory Ticker */}
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 sm:px-8 py-1.5 text-xs flex items-center space-x-3">
          <span className="bg-[#B7791F] text-white text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase flex items-center gap-1">
            <i className="fa-solid fa-bullhorn text-[9px]"></i> Advisory
          </span>
          <p className="truncate font-medium text-[11px]">
            Bidders must verify Class-3 Digital Signature Certificate (DSC) validity and Java Runtime Environment
            (JRE 8u251+) compatibility before submitting encrypted bids.
          </p>
        </div>
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <main id="main-content" className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 flex-grow">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-[#D6D9DE] gap-2">
          <div>
            <nav className="flex text-[11px] text-slate-500 space-x-2 mb-1">
              <Link to="/" className="hover:text-[#1A5AA6]">Home</Link>
              <span>/</span>
              <span className="text-slate-400">Bidder Services</span>
              <span>/</span>
              <span className="text-slate-800 font-semibold">Bidder Login</span>
            </nav>
            <h2 className="text-xl font-bold tracking-tight text-[#12355B] uppercase flex items-center gap-2">
              <i className="fa-solid fa-lock text-[#1A5AA6] text-base"></i>
              BIDDER LOGIN
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Login to access your bidder account, participate in active tenders, and monitor online bid submissions.
            </p>
          </div>

          {/* Quick Tab Trigger for Demonstration States */}
          <div className="flex items-center bg-white border border-slate-300 rounded p-1 text-[11px] shadow-sm self-start md:self-auto">
            <span className="text-[10px] uppercase font-bold text-slate-500 px-2 flex items-center gap-1">
              <i className="fa-solid fa-flask text-slate-400"></i> UI Preview State:
            </span>
            {STATE_BUTTONS.map((btn) => (
              <button
                key={btn.id}
                onClick={() => setState(btn.id)}
                className={
                  'px-2.5 py-1 rounded font-medium transition ' +
                  (state === btn.id
                    ? btn.id === 'success'
                      ? 'bg-emerald-700 text-white'
                      : btn.id === 'default'
                        ? 'bg-[#12355B] text-white'
                        : 'bg-red-700 text-white'
                    : btn.id === 'success'
                      ? 'text-emerald-700 hover:bg-emerald-50'
                      : 'text-slate-700 hover:bg-slate-100')
                }
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2-Column Authentication Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: AUTHENTICATION FORM PANEL (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded border border-[#D6D9DE] shadow-sm overflow-hidden">
            <div className="bg-[#12355B] text-white px-6 py-3 border-b border-[#0B1F3A] flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <i className="fa-solid fa-shield-halved text-amber-400 text-sm"></i>
                <h3 className="font-bold text-sm tracking-wide">Bidder Authentication</h3>
              </div>
              <span className="text-[11px] text-slate-300 bg-white/10 px-2.5 py-0.5 rounded font-mono">Form Ref: CPCL-AUTH-01</span>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* ALERT BANNER (state-driven) */}
              <div>
                {state === 'default' && (
                  <div className="bg-[#EAF2F8] border-l-4 border-[#1A5AA6] p-3 text-xs text-[#12355B] rounded-r flex items-start space-x-2.5">
                    <i className="fa-solid fa-circle-info text-[#1A5AA6] mt-0.5 text-sm"></i>
                    <div>
                      <span className="font-bold block">Authorized Bidder Access Only:</span>
                      Authorized vendors must enter their official registered Login ID and dual-layer password.
                      Fields marked with (<span className="text-[#B3261E] font-bold">*</span>) are mandatory.
                    </div>
                  </div>
                )}

                {state === 'invalid-cred' && (
                  <div className="bg-red-50 border-l-4 border-[#B3261E] p-3.5 text-xs text-red-900 rounded-r">
                    <div className="flex items-start space-x-2.5">
                      <i className="fa-solid fa-circle-exclamation text-[#B3261E] mt-0.5 text-base"></i>
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-[#B3261E]">Login failed</div>
                        <p className="text-xs text-red-800">Invalid Login ID or Password. Please verify your credentials and try again.</p>
                        <p className="text-[11px] text-red-700 font-mono">
                          Attempts remaining before temporary lockout: <strong>2 of 3</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {state === 'invalid-captcha' && (
                  <div className="bg-amber-50 border-l-4 border-[#B7791F] p-3.5 text-xs text-amber-900 rounded-r">
                    <div className="flex items-start space-x-2.5">
                      <i className="fa-solid fa-triangle-exclamation text-[#B7791F] mt-0.5 text-base"></i>
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-[#B7791F]">Security verification failed.</div>
                        <p className="text-xs text-amber-800">Please enter the displayed CAPTCHA again. CAPTCHA verification is case-sensitive.</p>
                      </div>
                    </div>
                  </div>
                )}

                {state === 'locked' && (
                  <div className="bg-red-100 border-2 border-[#B3261E] p-4 text-xs text-red-950 rounded">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0 text-[#B3261E]">
                        <i className="fa-solid fa-lock text-base"></i>
                      </div>
                      <div className="space-y-1.5">
                        <div className="font-bold text-sm text-[#B3261E]">Account temporarily locked.</div>
                        <p className="text-xs">
                          For security reasons, login access has been temporarily restricted due to multiple failed
                          authentication attempts.
                        </p>
                        <div className="bg-white/80 p-2.5 rounded border border-red-200 text-[11px] space-y-1">
                          <p>• Lockout duration: <strong className="font-mono">30 minutes</strong> or until security unfreeze.</p>
                          <p>• For urgent unlocked access, contact Nodal Desk: <strong className="text-slate-900">eproc-support@cpcl.co.in</strong></p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {state === 'success' && (
                  <div className="bg-emerald-50 border-2 border-[#2E7D32] p-5 text-xs text-emerald-950 rounded">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-[#2E7D32] flex-shrink-0">
                        <i className="fa-solid fa-circle-check text-2xl"></i>
                      </div>
                      <div className="space-y-1">
                        <div className="font-bold text-base text-[#2E7D32]">Authentication successful</div>
                        <p className="text-xs text-emerald-800">Redirecting to Bidder Dashboard...</p>
                        <div className="flex items-center space-x-2 pt-1 text-[11px] text-emerald-700">
                          <i className="fa-solid fa-circle-notch fa-spin"></i>
                          <span>Establishing authenticated session token &amp; loading bidder tenders...</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-emerald-200 flex justify-between items-center text-[11px]">
                      <span className="text-emerald-800 font-mono">Session ID: CPCL_SEC_78942A</span>
                      <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="font-bold text-[#1A5AA6] hover:underline cursor-pointer"
                      >
                        Proceed manually &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* LOGIN FORM */}
              <form
                id="bidder-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  setState('success');
                }}
                className={'space-y-5 transition-opacity' + (formDisabled ? ' opacity-40 pointer-events-none' : '')}
              >
                {/* FIELD 1: Login ID */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="login-id" className="block text-xs font-bold text-slate-800 tracking-tight">
                      Login ID <span className="text-[#B3261E] font-bold">*</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">Registered Email ID or User ID</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <i className="fa-regular fa-user text-xs"></i>
                    </div>
                    <input
                      type="text"
                      id="login-id"
                      name="login-id"
                      required
                      placeholder="Enter Login ID"
                      defaultValue="techsol_infra@biddercorp.in"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-[#D6D9DE] rounded text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1A5AA6] focus:border-transparent transition shadow-inner font-medium"
                    />
                  </div>
                </div>

                {/* FIELD 2: Password */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="password-input" className="block text-xs font-bold text-slate-800 tracking-tight">
                      Password <span className="text-[#B3261E] font-bold">*</span>
                    </label>
                    <a href="#forgot" className="text-[11px] text-[#1A5AA6] hover:underline font-medium">Forgot Password?</a>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <i className="fa-solid fa-key text-xs"></i>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password-input"
                      name="password"
                      required
                      placeholder="Enter Password"
                      defaultValue="SecurePass@2026"
                      className="w-full pl-9 pr-10 py-2 bg-white border border-[#D6D9DE] rounded text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1A5AA6] focus:border-transparent transition shadow-inner font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                      aria-label="Toggle password visibility"
                    >
                      <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                    </button>
                  </div>
                </div>

                {/* FIELD 3: Security Verification (CAPTCHA) */}
                <div className="bg-slate-50 p-3.5 rounded border border-[#D6D9DE] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800 tracking-tight">
                      Security Verification <span className="text-[#B3261E] font-bold">*</span>
                    </label>
                    <span className="text-[10px] text-slate-500">Case-sensitive image verification</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex items-center space-x-2">
                      <div className="captcha-noise bg-[#EAF2F8] border border-slate-300 rounded px-4 py-2 flex items-center justify-center select-none shadow-sm relative overflow-hidden">
                        <span
                          className="font-mono text-lg font-black tracking-widest text-[#12355B] line-through decoration-slate-400 decoration-1"
                          style={{ transform: 'skew(-5deg)', letterSpacing: '0.25em' }}
                        >
                          X7P4QK
                        </span>
                        <div className="absolute inset-0 border-t border-b border-dashed border-slate-300/40 pointer-events-none"></div>
                      </div>

                      <div className="flex flex-col space-y-1">
                        <button type="button" className="p-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded text-slate-600 text-xs shadow-xs focus:ring-1 focus:ring-[#1A5AA6]" title="Refresh CAPTCHA">
                          <i className="fa-solid fa-arrows-rotate"></i>
                        </button>
                        <button type="button" className="p-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded text-slate-600 text-xs shadow-xs focus:ring-1 focus:ring-[#1A5AA6]" title="Audio CAPTCHA">
                          <i className="fa-solid fa-volume-high"></i>
                        </button>
                      </div>
                    </div>

                    <div className="flex-grow">
                      <input
                        type="text"
                        id="captcha-input"
                        required
                        placeholder="Enter Captcha"
                        defaultValue="X7P4QK"
                        maxLength={6}
                        className="w-full px-3 py-2 bg-white border border-[#D6D9DE] rounded text-xs font-mono uppercase tracking-widest text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1A5AA6] focus:border-transparent uppercase shadow-inner"
                      />
                    </div>
                  </div>
                </div>

                {/* PRIMARY BUTTON */}
                <div className="pt-2">
                  <button
                    type="submit"
                    id="submit-btn"
                    className="w-full bg-[#1A5AA6] hover:bg-[#12355B] active:bg-[#0B1F3A] text-white font-bold py-2.5 px-4 rounded text-sm tracking-wide transition shadow-sm flex items-center justify-center space-x-2 focus:ring-2 focus:ring-offset-2 focus:ring-[#1A5AA6]"
                  >
                    <i className="fa-solid fa-right-to-bracket text-xs"></i>
                    <span>LOGIN</span>
                  </button>
                </div>

                {/* SECONDARY UTILITY LINKS */}
                <div className="pt-3 border-t border-[#D6D9DE] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                  <a href="#" className="text-[#1A5AA6] hover:text-[#12355B] hover:underline font-semibold flex items-center space-x-1">
                    <i className="fa-solid fa-unlock-keyhole text-[10px]"></i>
                    <span>Generate / Forgot Password?</span>
                  </a>
                  <span className="hidden sm:inline text-slate-300">|</span>
                  <a href="#" className="text-[#1A5AA6] hover:text-[#12355B] hover:underline font-semibold flex items-center space-x-1">
                    <i className="fa-solid fa-user-plus text-[10px]"></i>
                    <span>Online Bidder Enrollment</span>
                  </a>
                  <span className="hidden sm:inline text-slate-300">|</span>
                  <a href="#" className="text-[#1A5AA6] hover:text-[#12355B] hover:underline font-semibold flex items-center space-x-1">
                    <i className="fa-solid fa-circle-question text-[10px]"></i>
                    <span>Help for Bidders</span>
                  </a>
                </div>
              </form>
            </div>

            {/* Form Security Bar */}
            <div className="bg-slate-50 px-6 py-2.5 border-t border-[#D6D9DE] flex flex-wrap justify-between items-center text-[11px] text-slate-500">
              <div className="flex items-center space-x-1.5">
                <i className="fa-solid fa-lock text-emerald-600 text-xs"></i>
                <span>2048-bit TLS/PKI Encrypted Channel</span>
              </div>
              <div className="font-mono text-[10px]">Node: CHN-PROC-SRV-04</div>
            </div>
          </div>

          {/* RIGHT COLUMN: IMPORTANT LOGIN INFORMATION & ASSISTANCE (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded border border-[#D6D9DE] shadow-sm overflow-hidden">
              <div className="bg-[#12355B] text-white px-5 py-2.5 flex items-center space-x-2 border-b border-[#0B1F3A]">
                <i className="fa-solid fa-triangle-exclamation text-amber-400 text-xs"></i>
                <h3 className="font-bold text-xs uppercase tracking-wide">Important Login Information</h3>
              </div>

              <div className="p-5 space-y-4 text-xs text-slate-700">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-[#EAF2F8] text-[#1A5AA6] flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">1</div>
                  <p className="leading-relaxed">
                    Please ensure that your registered <strong className="text-slate-900">Login ID and password</strong> are
                    entered correctly. Passwords are strictly case-sensitive.
                  </p>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-[#EAF2F8] text-[#1A5AA6] flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">2</div>
                  <p className="leading-relaxed">
                    For first-time bidders, complete <a href="#" className="text-[#1A5AA6] font-bold hover:underline">Online Bidder Enrollment</a>{' '}
                    before attempting to log in to map your Class-3 DSC token.
                  </p>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-[#EAF2F8] text-[#1A5AA6] flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">3</div>
                  <p className="leading-relaxed">
                    Keep your registered email address and mobile number available for{' '}
                    <strong className="text-slate-900">account recovery</strong> and statutory two-factor SMS OTP authentication.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500 bg-slate-50 -mx-5 -mb-5 p-4 flex items-center justify-between">
                  <span>Class-3 DSC Token Required for Tender Submission</span>
                  <i className="fa-solid fa-certificate text-[#1A5AA6]"></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded border border-[#D6D9DE] shadow-sm p-4 text-xs">
              <h4 className="font-bold text-slate-800 text-xs mb-3 flex items-center space-x-2 text-[#12355B]">
                <i className="fa-solid fa-laptop-code text-[#1A5AA6]"></i>
                <span>System Requirements for DSC Signer</span>
              </h4>
              <ul className="space-y-2 text-[11px] text-slate-600">
                <li className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span>Operating System:</span>
                  <span className="font-medium text-slate-800">Windows 10/11 or Ubuntu 20.04+</span>
                </li>
                <li className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span>Java Runtime:</span>
                  <span className="font-medium text-slate-800">JRE 8 Update 251 or higher</span>
                </li>
                <li className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span>PKI Signing Utility:</span>
                  <a href="#" className="text-[#1A5AA6] font-bold hover:underline flex items-center gap-1">
                    <span>Download v2.4</span>
                    <i className="fa-solid fa-download text-[9px]"></i>
                  </a>
                </li>
                <li className="flex items-center justify-between">
                  <span>Supported Browsers:</span>
                  <span className="font-medium text-slate-800">Edge, Chrome, Firefox (Latest)</span>
                </li>
              </ul>
            </div>

            <div className="bg-[#EAF2F8] border border-[#BFDBFE] rounded p-4 text-xs">
              <div className="flex items-center space-x-2 mb-2">
                <i className="fa-solid fa-headset text-[#1A5AA6] text-sm"></i>
                <span className="font-bold text-[#12355B] uppercase text-[11px] tracking-wide">Tender Technical Helpdesk</span>
              </div>
              <p className="text-[11px] text-slate-600 mb-3">For login issues, DSC mapping failures, or account unlock requests:</p>
              <div className="bg-white p-3 rounded border border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Toll Free:</span>
                  <span className="font-bold text-[#12355B]">1800-425-7800</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Direct Landline:</span>
                  <span className="font-mono text-slate-800">+91 44 2594 4000</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Support Email:</span>
                  <span className="font-mono text-[#1A5AA6] text-[11px]">eproc-support@cpcl.co.in</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 text-center">Helpdesk Hours: Monday – Saturday (09:00 to 18:00 IST)</p>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#0B1F3A] text-white text-xs mt-12 border-t-2 border-govSaffron">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded bg-white text-[#12355B] flex items-center justify-center font-black text-xs">CPCL</div>
                <div>
                  <div className="font-bold text-white text-xs">e-Procurement Portal</div>
                  <div className="text-[10px] text-slate-400">SIH 2026 Prototype</div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Chennai Petroleum Corporation Limited (CPCL)
                <br />
                A Government of India Enterprise
                <br />
                Ministry of Petroleum &amp; Natural Gas
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider mb-3 pb-1 border-b border-slate-700">Statutory Policies</h4>
              <ul className="space-y-1.5 text-[11px] text-slate-400">
                <li><a href="#" className="hover:text-amber-400 transition">&rsaquo; Website Policies &amp; Disclaimers</a></li>
                <li><a href="#" className="hover:text-amber-400 transition">&rsaquo; Privacy &amp; Data Security Policy</a></li>
                <li><a href="#" className="hover:text-amber-400 transition">&rsaquo; Terms &amp; General Conditions of Tender</a></li>
                <li><a href="#" className="hover:text-amber-400 transition">&rsaquo; Hyperlinking Policy</a></li>
                <li><a href="#" className="hover:text-amber-400 transition">&rsaquo; Copyright &amp; Ownership Policy</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider mb-3 pb-1 border-b border-slate-700">Compliance &amp; Governance</h4>
              <ul className="space-y-1.5 text-[11px] text-slate-400">
                <li><a href="#" className="hover:text-amber-400 transition">&rsaquo; Central Vigilance Commission (CVC)</a></li>
                <li><a href="#" className="hover:text-amber-400 transition">&rsaquo; Accessibility Statement (GIGW 3.0)</a></li>
                <li><a href="#" className="hover:text-amber-400 transition">&rsaquo; Right to Information Act (RTI)</a></li>
                <li><a href="#" className="hover:text-amber-400 transition">&rsaquo; Independent External Monitors (IEM)</a></li>
                <li><a href="#" className="hover:text-amber-400 transition">&rsaquo; Public Grievance Portal (CPGRAMS)</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider mb-3 pb-1 border-b border-slate-700">Security &amp; Audit Counter</h4>
              <div className="bg-slate-900/80 p-3 rounded border border-slate-800 space-y-2 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Security Standard:</span>
                  <span className="font-semibold text-emerald-400">STQC CERTIFIED</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">PKI Encryption:</span>
                  <span className="font-mono text-slate-200">2048-BIT SHA256</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Hosting Datacenter:</span>
                  <span className="text-[10px] text-slate-300 font-mono">NIC-TN-DC02 (MeitY)</span>
                </div>
                <div className="pt-1.5 border-t border-slate-800 text-[10px] text-amber-300/90 flex items-center gap-1">
                  <i className="fa-solid fa-circle-check text-emerald-400"></i>
                  <span>Compliant with GIGW 3.0 Guidelines</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#071324] py-3 px-4 sm:px-8 border-t border-slate-800 text-[11px] text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
            <div>
              Website Content Managed by <strong className="text-slate-200">Chennai Petroleum Corporation Limited (CPCL)</strong> • Designed &amp;
              Developed for Smart India Hackathon 2026 Prototype
            </div>
            <div className="text-slate-400">For demonstration purposes — Smart India Hackathon 2026</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
