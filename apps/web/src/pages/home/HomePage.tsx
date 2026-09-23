// Bidder Home page — ported from the Stitch screen
// "CPCL e-Procurement Portal - Bidder Home" (project: GeM Portal).
//
// Source of truth: Stitch project 6921642772921774119, screen
// 50ec89d921c5415885c3dca23f411bdb. Ported as closely as possible to the
// generated HTML/Tailwind markup so the page matches the design 1:1.
//
// TODO: replace static/mock content (tender rows, notices, counters) with
// data from features/tenders and features/dashboard via services/api once
// the gateway exposes /api/tenders and related endpoints. TODO: wire the
// "Bidder / DSC Login" and "Bidder Portal Login" actions to the /login route.

import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="bg-background font-sans text-on-surface text-[13px] leading-normal antialiased">
      {/* TOP SOVEREIGN BANNER */}
      <header className="fixed top-0 left-0 right-0 z-50 shadow-sm">
        {/* Top Government Strip */}
        <div className="bg-primary-container text-on-primary border-b border-primary">
          <div className="w-full px-6 flex items-center justify-between h-8 text-[11px]">
            <div className="flex items-center gap-3 font-medium">
              <span>भारत सरकार | Government of India</span>
              <span className="hidden md:inline text-slate-400">•</span>
              <span className="hidden md:inline text-slate-300">
                पेट्रोलियम और प्राकृतिक गैस मंत्रालय | Ministry of Petroleum &amp; Natural Gas
              </span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <a className="hover:text-white transition-colors" href="#main-content">
                Skip to Main Content
              </a>
              <span className="text-slate-500">|</span>
              <button className="flex items-center gap-1 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[13px]">hearing</span>
                <span className="hidden sm:inline">Screen Reader</span>
              </button>
              <span className="text-slate-500">|</span>
              <div className="flex items-center gap-1 bg-[#051325] px-1.5 py-0.5 rounded border border-slate-700">
                <button className="px-1 hover:text-white text-slate-300 font-medium" title="Decrease font size">
                  A-
                </button>
                <button className="px-1 text-white font-bold" title="Normal font size">
                  A
                </button>
                <button className="px-1 hover:text-white text-slate-300 font-medium" title="Increase font size">
                  A+
                </button>
              </div>
              <span className="text-slate-500">|</span>
              <div className="flex items-center gap-1">
                <button className="text-white font-semibold hover:underline">English</button>
                <span className="text-slate-500">/</span>
                <button className="hover:text-white">हिन्दी</button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Branding Header */}
        <div className="bg-white border-b border-slate-200">
          <div className="w-full px-6 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded bg-primary-container flex flex-col items-center justify-center text-white font-bold shadow-sm ring-1 ring-slate-900/10">
                <span className="text-[14px] leading-tight tracking-tight">CPCL</span>
                <span className="text-[7px] font-medium tracking-widest text-[#ffb77a]">सीपीसीएल</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[17px] text-slate-900 font-bold tracking-tight">e-Procurement Portal</span>
                  <span className="text-[12px] text-slate-500 hidden sm:inline">(e-निविदा पोर्टल)</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-bold tracking-wide uppercase border border-amber-200">
                    SIH 2026 Prototype
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  Chennai Petroleum Corporation Limited (A Government of India Enterprise)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden xl:flex flex-col text-right pr-4 border-r border-slate-200">
                <div className="flex items-center justify-end gap-1 text-slate-500 text-[11px]">
                  <span className="material-symbols-outlined text-[14px] text-secondary">schedule</span>
                  <span>IST Server Time:</span>
                </div>
                <span className="text-[12px] font-mono font-semibold text-slate-800">27-Feb-2025 | 11:42:18 IST</span>
              </div>
              <Link
                className="inline-flex items-center gap-1.5 bg-[#0050d7] hover:bg-[#003da9] text-white px-3.5 py-1.5 rounded font-semibold text-[12px] tracking-wide shadow-sm transition-colors"
                to="/login"
              >
                <span className="material-symbols-outlined text-[16px]">vpn_key</span>
                <span>Bidder / DSC Login</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Sovereign Navigation Bar */}
        <div className="bg-[#0b1f3a] text-white border-b border-[#0050d7]">
          <div className="w-full px-6 flex items-center justify-between">
            <nav className="flex items-center overflow-x-auto whitespace-nowrap text-[12px] font-medium">
              <a className="px-4 py-2.5 bg-[#0050d7] text-white font-semibold flex items-center gap-1.5" href="#">
                <span className="material-symbols-outlined text-[15px]">home</span>
                <span>Home</span>
              </a>
              <a className="px-4 py-2.5 text-slate-200 hover:text-white hover:bg-slate-800/60 transition-colors" href="#">
                Tenders by Org
              </a>
              <a className="px-4 py-2.5 text-slate-200 hover:text-white hover:bg-slate-800/60 transition-colors" href="#">
                Active Tenders
              </a>
              <a className="px-4 py-2.5 text-slate-200 hover:text-white hover:bg-slate-800/60 transition-colors" href="#">
                Corrigenda
              </a>
              <a className="px-4 py-2.5 text-slate-200 hover:text-white hover:bg-slate-800/60 transition-colors" href="#">
                Tender Notices
              </a>
              <a className="px-4 py-2.5 text-slate-200 hover:text-white hover:bg-slate-800/60 transition-colors" href="#">
                Downloads &amp; Forms
              </a>
              <a className="px-4 py-2.5 text-slate-200 hover:text-white hover:bg-slate-800/60 transition-colors" href="#">
                Helpdesk Matrix
              </a>
              <a className="px-4 py-2.5 text-slate-200 hover:text-white hover:bg-slate-800/60 transition-colors" href="#">
                Contact CPCL
              </a>
            </nav>
            <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-mono">Central Public Procurement Synced</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN VIEWPORT CONTAINER */}
      <main className="w-full pt-[132px] pb-12" id="main-content">
        {/* 1. OFFICIAL TICKER / ADVISORY STRIP */}
        <div className="w-full bg-[#eef3f9] border-b border-slate-200 px-6 py-1.5 flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#0b1f3a] text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0">
            <span className="material-symbols-outlined text-[13px] text-[#ffb77a]">campaign</span>
            <span>Advisory</span>
          </div>
          <div className="overflow-hidden whitespace-nowrap w-full">
            <div className="inline-block font-medium text-[12px] text-slate-700">
              <span>
                Mandatory Advisory: Bidders must possess Class-3 Digital Signature Certificate (DSC) registered 48 hrs
                prior to submission.
              </span>
              <span className="mx-3 text-[#0050d7]">•</span>
              <span>SIH 2026 Prototype Environment — Authorized Public Procurement Protocol Testing</span>
              <span className="mx-3 text-[#0050d7]">•</span>
              <span className="font-semibold text-slate-900">
                National Toll-Free Assistance: 1800-425-7800 (Mon-Sat 09:00 - 18:00 IST)
              </span>
              <span className="mx-3 text-[#0050d7]">•</span>
              <span>
                All vendors claiming MSE/MSME purchase preference must enter valid Udyam Registration numbers during
                technical bid submission.
              </span>
            </div>
          </div>
        </div>

        {/* 2. BIDDER 3-STEP JOURNEY HELPER BAR */}
        <div className="w-full px-6 pt-4 pb-2">
          <div className="bg-white border border-slate-200 rounded p-3 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-[12px]">
            <div className="flex items-center gap-2 shrink-0">
              <span className="material-symbols-outlined text-[#0050d7] text-[18px]">verified</span>
              <span className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                E-Procurement Workflow:
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 w-full max-w-4xl">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded">
                <span className="w-5 h-5 rounded-full bg-[#0b1f3a] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  1
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="font-bold text-slate-800 text-[11px]">Enroll &amp; Map DSC</span>
                  <span className="text-[10px] text-slate-500">Register with Class-3 Token</span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded">
                <span className="w-5 h-5 rounded-full bg-[#0050d7] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  2
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="font-bold text-slate-800 text-[11px]">Download Specifications</span>
                  <span className="text-[10px] text-slate-500">Access NIT, BOQ &amp; Drawings</span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded">
                <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  3
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="font-bold text-slate-800 text-[11px]">Encrypted Bid Submission</span>
                  <span className="text-[10px] text-slate-500">Dual-key locked until opening</span>
                </div>
              </div>
            </div>
            <div className="shrink-0 hidden xl:block">
              <a className="text-[#0050d7] hover:underline font-semibold text-[11px] flex items-center gap-1" href="#">
                <span>Bidder Manual</span>
                <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
              </a>
            </div>
          </div>
        </div>

        {/* 3. MAIN OPERATIONAL 12-COLUMN LAYOUT */}
        <div className="w-full px-6 pt-2 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT MAIN COLUMN (8 Columns) */}
            <div className="lg:col-span-8 flex flex-col gap-5">
              {/* SEARCH TENDERS BAR */}
              <section className="bg-white border border-slate-200 rounded p-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-100 gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#0050d7] text-[19px]">manage_search</span>
                      <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">Search Public Tenders</h2>
                    </div>
                    <p className="text-[12px] text-slate-500 mt-0.5">
                      Filter by Tender ID, keyword, division or procurement classification.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <a className="text-[#0050d7] font-semibold hover:underline flex items-center gap-1" href="#">
                      <span className="material-symbols-outlined text-[14px]">tune</span>
                      <span>Advanced Search</span>
                    </a>
                    <span className="text-slate-300">|</span>
                    <a className="text-[#0050d7] font-semibold hover:underline flex items-center gap-1" href="#">
                      <span className="material-symbols-outlined text-[14px]">verified_user</span>
                      <span>EMD Exempted</span>
                    </a>
                  </div>
                </div>
                <form
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
                  onSubmit={(event) => event.preventDefault()}
                >
                  <div className="md:col-span-5 flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider" htmlFor="search-query">
                      Tender Keyword / Ref ID
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-2.5 text-slate-400 text-[16px]">
                        search
                      </span>
                      <input
                        className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-slate-50 border border-slate-300 rounded text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0050d7] focus:ring-1 focus:ring-[#0050d7] transition-all"
                        id="search-query"
                        placeholder="e.g. CPCL/PROC/2026/041 or CCTV"
                        type="text"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-3 flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider" htmlFor="division-select">
                      Refinery / Division
                    </label>
                    <div className="relative">
                      <select
                        className="w-full px-2.5 py-1.5 text-[12px] bg-slate-50 border border-slate-300 rounded text-slate-800 focus:outline-none focus:bg-white focus:border-[#0050d7] focus:ring-1 focus:ring-[#0050d7] appearance-none cursor-pointer"
                        id="division-select"
                      >
                        <option value="">All Divisions &amp; Plants</option>
                        <option value="manali">Manali Refinery - Chennai</option>
                        <option value="cauvery">Cauvery Basin Refinery (CBR)</option>
                        <option value="corporate">Corporate Office - Teynampet</option>
                        <option value="expansion">9 MMTPA Expansion Complex</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-2 top-2 text-slate-500 text-[16px] pointer-events-none">
                        expand_more
                      </span>
                    </div>
                  </div>
                  <div className="md:col-span-2 flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider" htmlFor="category-select">
                      Category
                    </label>
                    <div className="relative">
                      <select
                        className="w-full px-2.5 py-1.5 text-[12px] bg-slate-50 border border-slate-300 rounded text-slate-800 focus:outline-none focus:bg-white focus:border-[#0050d7] focus:ring-1 focus:ring-[#0050d7] appearance-none cursor-pointer"
                        id="category-select"
                      >
                        <option value="">All Categories</option>
                        <option value="goods">Goods &amp; Supply</option>
                        <option value="works">Works Contracts</option>
                        <option value="services">Services &amp; AMC</option>
                        <option value="it">IT &amp; Automation</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-2 top-2 text-slate-500 text-[16px] pointer-events-none">
                        expand_more
                      </span>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <button
                      className="w-full h-[32px] bg-[#0050d7] hover:bg-[#003da9] text-white rounded font-semibold text-[12px] tracking-wide flex items-center justify-center gap-1 shadow-xs transition-colors"
                      type="submit"
                    >
                      <span className="material-symbols-outlined text-[16px]">search</span>
                      <span>Search</span>
                    </button>
                  </div>
                </form>
              </section>

              {/* TENDER DATA TABLE SECTION */}
              <section className="bg-white border border-slate-200 rounded shadow-xs overflow-hidden flex flex-col">
                <div className="bg-slate-100 border-b border-slate-200 px-3 pt-2 flex items-center justify-between gap-2 overflow-x-auto">
                  <div className="flex items-center gap-1" role="tablist">
                    <button
                      aria-selected="true"
                      className="bg-white text-slate-900 border-t-2 border-t-[#0050d7] border-x border-slate-200 font-bold text-[12px] px-3.5 py-2 rounded-t flex items-center gap-1.5 shadow-xs"
                      role="tab"
                    >
                      <span>Active Tenders</span>
                      <span className="bg-[#0050d7] text-white text-[10px] px-1.5 py-0.2 rounded font-bold">24</span>
                    </button>
                    <button
                      aria-selected="false"
                      className="text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 font-medium text-[12px] px-3.5 py-2 rounded-t flex items-center gap-1.5 transition-colors"
                      role="tab"
                    >
                      <span>Closing Soon</span>
                      <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.2 rounded font-bold">5</span>
                    </button>
                    <button
                      aria-selected="false"
                      className="text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 font-medium text-[12px] px-3.5 py-2 rounded-t flex items-center gap-1.5 transition-colors"
                      role="tab"
                    >
                      <span>Recently Closed</span>
                      <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded font-semibold">82</span>
                    </button>
                    <button
                      aria-selected="false"
                      className="text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 font-medium text-[12px] px-3.5 py-2 rounded-t flex items-center gap-1.5 transition-colors"
                      role="tab"
                    >
                      <span>Corrigenda</span>
                      <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded font-semibold">12</span>
                    </button>
                  </div>
                  <div className="hidden sm:flex items-center gap-1 pb-1.5 shrink-0">
                    <button
                      className="p-1 rounded bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors"
                      title="Export as Excel"
                    >
                      <span className="material-symbols-outlined text-[16px]">table_view</span>
                    </button>
                    <button
                      className="p-1 rounded bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors"
                      title="Export as PDF"
                    >
                      <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                    </button>
                    <button
                      className="p-1 rounded bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors"
                      title="Refresh Table"
                    >
                      <span className="material-symbols-outlined text-[16px]">refresh</span>
                    </button>
                  </div>
                </div>

                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-600 gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 uppercase tracking-wider">Active Division:</span>
                    <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-800 font-medium">
                      Manali Works, Operations &amp; IT (All Active)
                    </span>
                  </div>
                  <div>Strict Central Vigilance Commission (CVC) reverse chronologic sequencing</div>
                </div>

                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#0b1f3a] text-white text-[11px] font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3.5" scope="col">Tender Title &amp; Scope</th>
                        <th className="py-2.5 px-3 whitespace-nowrap" scope="col">Reference &amp; Tender ID</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap" scope="col">Estimated Value / EMD</th>
                        <th className="py-2.5 px-3 whitespace-nowrap" scope="col">Bid Submission Deadline</th>
                        <th className="py-2.5 px-3 text-center" scope="col">Status</th>
                        <th className="py-2.5 px-3 text-center" scope="col">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-[12px]">
                      {TENDER_ROWS.map((row, idx) => (
                        <tr
                          key={row.refId}
                          className={`hover:bg-blue-50/40 transition-colors ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                        >
                          <td className="py-3 px-3.5 max-w-xs">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.2 rounded ${row.tagClass} text-[10px] font-bold uppercase tracking-wide`}>
                                  {row.tag}
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                                  {row.subTag}
                                </span>
                              </div>
                              <a className="font-semibold text-slate-900 hover:text-[#0050d7] leading-snug" href="#">
                                {row.title}
                              </a>
                              <span className="text-slate-500 text-[11px]">{row.location}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap align-top">
                            <div className="flex flex-col font-mono text-[11px]">
                              <span className="font-bold text-slate-900">{row.refId}</span>
                              <span className="text-slate-500">ID: {row.internalId}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap align-top">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 text-[12px]">{row.value}</span>
                              <span className="text-slate-500 text-[11px]">EMD: {row.emd}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap align-top">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1">
                                <span className={row.urgent ? 'font-bold text-red-600' : 'font-bold text-slate-900'}>
                                  {row.deadlineDate}
                                </span>
                                {row.daysLeft && (
                                  <span className="px-1 py-0.2 rounded bg-red-100 text-red-700 text-[9px] font-bold">
                                    {row.daysLeft}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-slate-500 text-[11px]">{row.deadlineTime}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap align-top">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                              Active
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap align-top">
                            <div className="flex items-center justify-center gap-1">
                              <button className="px-2.5 py-1 bg-[#0050d7] text-white rounded text-[11px] font-semibold hover:bg-[#003da9] transition-colors shadow-xs">
                                View Details
                              </button>
                              <button
                                className="p-1 rounded border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors"
                                title="Download NIT Docs"
                              >
                                <span className="material-symbols-outlined text-[16px]">download</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[12px] text-slate-600">
                  <div className="flex items-center gap-2">
                    <span>
                      Showing <strong className="text-slate-900 font-semibold">1 to 5</strong> of{' '}
                      <strong className="text-slate-900 font-semibold">24</strong> active listings
                    </span>
                    <span className="text-slate-300">•</span>
                    <a className="text-[#0050d7] font-semibold hover:underline" href="#">
                      View Full Directory (24) →
                    </a>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="px-2 py-1 rounded border border-slate-200 bg-white text-slate-400 text-[11px] cursor-not-allowed" disabled>
                      Previous
                    </button>
                    <button className="w-6 h-6 rounded bg-[#0050d7] text-white text-[11px] font-bold flex items-center justify-center">1</button>
                    <button className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-medium flex items-center justify-center transition-colors">2</button>
                    <button className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-medium flex items-center justify-center transition-colors">3</button>
                    <button className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-medium flex items-center justify-center transition-colors">4</button>
                    <button className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-medium flex items-center justify-center transition-colors">5</button>
                    <button className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-medium transition-colors">Next</button>
                  </div>
                </div>
              </section>

              {/* STATUTORY COMPLIANCE & PROTOCOL PANELS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded p-4 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-[#0050d7] border border-blue-200 text-[10px] font-bold uppercase tracking-wider">
                        Automated Verification
                      </span>
                      <span className="material-symbols-outlined text-[#0050d7] text-[20px]">fact_check</span>
                    </div>
                    <h3 className="text-[14px] font-bold text-slate-900">Statutory Bid Compliance Checks</h3>
                    <p className="text-[12px] text-slate-600 mt-1 leading-relaxed">
                      Uploaded bids undergo systematic technical checks against statutory qualification benchmarks
                      prior to tender opening:
                    </p>
                    <ul className="flex flex-col gap-2 mt-3 text-[12px] text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-emerald-600 text-[16px] shrink-0 mt-0.5">check_circle</span>
                        <span>Automated verification of GSTIN, PAN, and MSME Udyam status via government API gateways.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-emerald-600 text-[16px] shrink-0 mt-0.5">check_circle</span>
                        <span>Integrity validation of mandatory instruments (EMD proof, Bank Guarantees &amp; BoQ templates).</span>
                      </li>
                    </ul>
                  </div>
                  <div className="mt-4 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-[#0050d7]">gavel</span>
                    <span>Conforms strictly to Central Vigilance Commission (CVC) Directives.</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded p-4 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                        PKI Vault Security
                      </span>
                      <span className="material-symbols-outlined text-emerald-700 text-[20px]">lock</span>
                    </div>
                    <h3 className="text-[14px] font-bold text-slate-900">Dual-Key Cryptographic Storage</h3>
                    <p className="text-[12px] text-slate-600 mt-1 leading-relaxed">
                      Bids remain fully locked in tamper-proof cryptographic vaults from upload until the scheduled
                      statutory opening hour:
                    </p>
                    <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded flex flex-col gap-1 text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                        <span className="material-symbols-outlined text-[15px] text-[#0050d7]">shield</span>
                        <span>Zero Officer Visibility Prior to Schedule</span>
                      </div>
                      <p className="text-slate-600 leading-snug">
                        Technical and financial covers cannot be decrypted by any procurement official prior to
                        dual-key authorization by the designated tender opening committee.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-emerald-600">verified</span>
                    <span>SHA-256 Checksums logged in public immutable audit logs.</span>
                  </div>
                </div>
              </div>

              {/* AUDIT TRANSPARENCY BANNER */}
              <div className="bg-[#0b1f3a] text-white rounded p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 border-l-4 border-l-[#ffb77a]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#ffb77a] text-[24px]">account_balance</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold tracking-tight">Open Public Procurement Protocol (e-Procure GIGW 3.0)</span>
                    <span className="text-[11px] text-slate-300">
                      Enforcing total transparency, fairness and equal opportunity across CPCL tenders.
                    </span>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded border border-white/10">
                  <span className="material-symbols-outlined text-[16px] text-[#ffb77a]">enhanced_encryption</span>
                  <span className="font-mono text-[11px] font-bold text-white tracking-wide">2048-bit PKI Encrypted</span>
                </div>
              </div>
            </div>

            {/* RIGHT SIDEBAR COLUMN (4 Columns) */}
            <aside className="lg:col-span-4 flex flex-col gap-4">
              {/* 1. BIDDER QUICK ACTIONS CARD */}
              <section className="bg-white border border-slate-200 rounded shadow-xs overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#0050d7] text-[18px]">badge</span>
                    <h3 className="text-[13px] font-bold text-slate-900 tracking-tight">Bidder Quick Actions</h3>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-200 px-1.5 py-0.2 rounded">
                    Self Service
                  </span>
                </div>
                <div className="p-3 flex flex-col gap-2">
                  <div className="p-2.5 rounded border border-slate-200 hover:border-[#0050d7]/40 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-blue-50 text-[#0050d7] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">person_add</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-slate-900">Online Bidder Enrollment</span>
                        <span className="text-[11px] text-slate-500">Register company &amp; Class-3 DSC</span>
                      </div>
                    </div>
                    <a className="px-2.5 py-1 bg-[#0b1f3a] hover:bg-slate-800 text-white rounded text-[11px] font-semibold transition-colors shrink-0" href="#">
                      Enroll
                    </a>
                  </div>
                  <div className="p-2.5 rounded border border-blue-200 bg-blue-50/30 hover:bg-blue-50/60 transition-colors flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-[#0050d7] text-white flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">login</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-slate-900">Bidder Portal Login</span>
                        <span className="text-[11px] text-slate-600">Access live bids &amp; submissions</span>
                      </div>
                    </div>
                    <Link className="px-2.5 py-1 bg-[#0050d7] hover:bg-[#003da9] text-white rounded text-[11px] font-semibold transition-colors shrink-0 shadow-xs" to="/login">
                      Login
                    </Link>
                  </div>
                  <div className="p-2.5 rounded border border-slate-200 hover:border-[#0050d7]/40 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-slate-900">Generate / Reset Token PIN</span>
                        <span className="text-[11px] text-slate-500">DSC authentication recovery</span>
                      </div>
                    </div>
                    <a className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded text-[11px] font-semibold transition-colors shrink-0" href="#">
                      Reset
                    </a>
                  </div>
                  <div className="p-2.5 rounded border border-slate-200 hover:border-[#0050d7]/40 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">contact_phone</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-slate-900">Find Concerned Nodal Officer</span>
                        <span className="text-[11px] text-slate-500">Division contact repository</span>
                      </div>
                    </div>
                    <a className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded text-[11px] font-semibold transition-colors shrink-0" href="#">
                      Search
                    </a>
                  </div>
                </div>
              </section>

              {/* 2. TENDER HELPDESK & SUPPORT */}
              <section className="bg-white border border-slate-200 rounded shadow-xs overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#0050d7] text-[18px]">support_agent</span>
                    <h3 className="text-[13px] font-bold text-slate-900 tracking-tight">Tender Helpdesk &amp; Support</h3>
                  </div>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                    Toll-Free
                  </span>
                </div>
                <div className="p-3.5 flex flex-col gap-2.5">
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Technical queries on DSC configuration, portal errors, or BoQ uploads:
                  </p>
                  <div className="p-3 rounded bg-[#0b1f3a] text-white flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300">CPCL Central Helpdesk</span>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#ffb77a] text-[20px]">phone_in_talk</span>
                      <span className="text-[18px] font-bold font-mono tracking-tight text-white">1800-425-7800</span>
                    </div>
                    <span className="text-[10px] text-slate-300">Mon - Sat: 09:00 - 18:00 IST (Excl. Gazetted Holidays)</span>
                  </div>
                  <div className="flex flex-col gap-1.5 pt-1 text-[11px] text-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[15px] text-[#0050d7]">mail</span>
                      <span className="text-slate-500">Email:</span>
                      <a className="font-semibold text-[#0050d7] hover:underline font-mono" href="mailto:eproc-support@cpcl.co.in">
                        eproc-support@cpcl.co.in
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[15px] text-[#0050d7]">call</span>
                      <span className="text-slate-500">Direct Landline:</span>
                      <span className="font-semibold text-slate-800 font-mono">+91 44 2594 4000</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. IMPORTANT BIDDER GUIDELINES & UTILITIES */}
              <section className="bg-white border border-slate-200 rounded shadow-xs overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#0050d7] text-[18px]">folder_special</span>
                    <h3 className="text-[13px] font-bold text-slate-900 tracking-tight">Guidelines &amp; Utilities</h3>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">Downloads</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {GUIDELINE_LINKS.map((item) => (
                    <a
                      key={item.label}
                      className="py-2.5 px-3.5 hover:bg-slate-50 flex items-center justify-between text-[12px] text-slate-800 hover:text-[#0050d7] transition-colors group"
                      href="#"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[#0050d7] text-[16px]">{item.icon}</span>
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <span className="material-symbols-outlined text-slate-400 group-hover:text-[#0050d7] text-[16px]">
                        {item.trailingIcon}
                      </span>
                    </a>
                  ))}
                </div>
              </section>

              {/* 4. OFFICIAL NOTICES & CORRIGENDA */}
              <section className="bg-white border border-slate-200 rounded shadow-xs overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#0050d7] text-[18px]">notifications_active</span>
                    <h3 className="text-[13px] font-bold text-slate-900 tracking-tight">Official Notices &amp; Corrigenda</h3>
                  </div>
                  <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider">
                    Live
                  </span>
                </div>
                <div className="p-3 flex flex-col gap-2.5">
                  {NOTICES.map((notice) => (
                    <div
                      key={notice.title}
                      className="p-2.5 rounded bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-semibold text-slate-600">{notice.date}</span>
                        <span className={`px-1.5 py-0.2 ${notice.tagClass} text-[9px] font-bold rounded uppercase`}>
                          {notice.tag}
                        </span>
                      </div>
                      <a className="font-semibold text-[12px] text-slate-900 hover:text-[#0050d7] leading-snug" href="#">
                        {notice.title}
                      </a>
                      <span className="text-[11px] text-slate-500">{notice.description}</span>
                    </div>
                  ))}
                </div>
                <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
                  <a className="text-[#0050d7] font-semibold text-[11px] hover:underline flex items-center justify-center gap-1" href="#">
                    <span>View All Tender Notices &amp; Circulars (48)</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </a>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>

      {/* FORMAL STATUTORY FOOTER */}
      <footer className="w-full bg-[#0b1f3a] text-slate-300 border-t-4 border-[#0050d7]">
        <div className="w-full px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-6 border-b border-slate-800 text-[12px]">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider mb-3 pb-1 border-b border-slate-700">
                Statutory Policies
              </span>
              <ul className="flex flex-col gap-1.5 text-slate-300">
                {[
                  'Website Policies & Disclaimers',
                  'Privacy & Data Security Policy',
                  'Terms & General Conditions of Tender',
                  'Hyperlinking Policy',
                  'Copyright & Ownership Policy',
                ].map((label) => (
                  <li key={label} className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[13px] text-[#ffb77a]">chevron_right</span>
                    <a className="hover:text-white transition-colors" href="#">{label}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider mb-3 pb-1 border-b border-slate-700">
                Compliance &amp; Governance
              </span>
              <ul className="flex flex-col gap-1.5 text-slate-300">
                {[
                  'Central Vigilance Commission (CVC)',
                  'Accessibility Compliance (GIGW 3.0)',
                  'Right to Information Act (RTI)',
                  'Independent External Monitors (IEM)',
                  'Public Grievance Portal (CPGRAMS)',
                ].map((label) => (
                  <li key={label} className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[13px] text-[#ffb77a]">chevron_right</span>
                    <a className="hover:text-white transition-colors" href="#">{label}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider mb-3 pb-1 border-b border-slate-700">
                Bidder Technical Support
              </span>
              <div className="flex flex-col gap-2 text-slate-300">
                <p className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#ffb77a] mt-0.5">mail</span>
                  <span>eproc-helpdesk@cpcl.co.in</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#ffb77a] mt-0.5">call</span>
                  <span>
                    +91 44 2594 4000 / 4001
                    <br />
                    (Mon-Fri 09:00 - 17:30 IST)
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#ffb77a] mt-0.5">location_on</span>
                  <span>CPCL, Manali, Chennai - 600068, Tamil Nadu, India</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col bg-[#051325] p-3.5 rounded border border-slate-800">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-700">
                Audit &amp; Security Counter
              </span>
              <div className="flex flex-col gap-1.5 text-[11px]">
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Total Portal Visitors:</span>
                  <span className="font-mono font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded">02,489,173</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Last Database Sync:</span>
                  <span className="font-mono text-slate-200">27-Feb-2025 09:30</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Compliance Standard:</span>
                  <span className="text-emerald-400 font-bold uppercase">STQC Certified</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-400">Hosting Datacenter:</span>
                  <span className="font-mono text-slate-300">NIC-TN-DC02 (MeitY Tier-III)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col md:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
            <p className="text-center md:text-left">
              Website Content Managed by{' '}
              <strong className="text-white">Chennai Petroleum Corporation Limited (CPCL)</strong> • Designed &amp;
              Developed for Smart India Hackathon 2026 Prototype
            </p>
            <p className="text-center md:text-right font-medium">
              Compliant with Guidelines for Indian Government Websites (GIGW 3.0) &amp; W3C-WAI (Level AA)
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Mock tender-listing data. TODO: replace with data fetched via
// features/tenders/api once GET /api/tenders is implemented on the gateway.
const TENDER_ROWS = [
  {
    tag: 'Goods',
    tagClass: 'bg-blue-100 text-blue-800',
    subTag: 'Two Cover',
    title: 'Supply of CCTV Cameras for Public Safety Infrastructure',
    location: 'Location: Manali Refinery Perimeter & Admin Block',
    refId: 'CPCL/PROC/2026/041',
    internalId: '2026_CPCL_89210_1',
    value: '₹ 42.50 Lakhs',
    emd: '₹ 85,000',
    deadlineDate: '04 Oct 2026',
    daysLeft: '5 days left',
    deadlineTime: '17:00 IST',
    urgent: true,
  },
  {
    tag: 'IT Hardware',
    tagClass: 'bg-indigo-100 text-indigo-800',
    subTag: 'ICB',
    title: 'Industrial Network Security & Firewall Equipment',
    location: 'Next-Gen OT Firewalls & Intrusion Prevention Modules',
    refId: 'CPCL/PROC/2026/039',
    internalId: '2026_CPCL_88942_1',
    value: '₹ 78.00 Lakhs',
    emd: '₹ 1,56,000',
    deadlineDate: '08 Oct 2026',
    daysLeft: '9 days left',
    deadlineTime: '15:00 IST',
    urgent: true,
  },
  {
    tag: 'Goods',
    tagClass: 'bg-blue-100 text-blue-800',
    subTag: 'Domestic',
    title: 'Supply of Control Room Displays & Video Wall Units',
    location: 'Industrial Ultra-High Brightness 4K Panels for Central Operations',
    refId: 'CPCL/PROC/2026/037',
    internalId: '2026_CPCL_87611_1',
    value: '₹ 29.80 Lakhs',
    emd: '₹ 60,000',
    deadlineDate: '12 Oct 2026',
    daysLeft: null,
    deadlineTime: '12:00 IST',
    urgent: false,
  },
  {
    tag: 'Services',
    tagClass: 'bg-purple-100 text-purple-800',
    subTag: 'AMC',
    title: 'Annual Maintenance Contract for Gas Turbine Generators',
    location: 'Captive Power Plant (CPP-II) Comprehensive Overhaul Support',
    refId: 'CPCL/PROC/2026/035',
    internalId: '2026_CPCL_86500_1',
    value: '₹ 115.00 Lakhs',
    emd: '₹ 2,30,000',
    deadlineDate: '15 Oct 2026',
    daysLeft: null,
    deadlineTime: '16:30 IST',
    urgent: false,
  },
  {
    tag: 'Works',
    tagClass: 'bg-amber-100 text-amber-800',
    subTag: 'Turnkey',
    title: 'Revamping of Effluent Treatment Plant Online Instrumentation',
    location: 'Supply, Erection, Testing & Commissioning of Real-Time Analyzers',
    refId: 'CPCL/PROC/2026/031',
    internalId: '2026_CPCL_85412_1',
    value: '₹ 64.20 Lakhs',
    emd: '₹ 1,28,400',
    deadlineDate: '18 Oct 2026',
    daysLeft: null,
    deadlineTime: '14:00 IST',
    urgent: false,
  },
];

const GUIDELINE_LINKS = [
  { label: 'DSC PKI Signing Utility (v2.4 Win/Linux)', icon: 'terminal', trailingIcon: 'download' },
  { label: 'Hassle-Free Bid Submission SOP', icon: 'description', trailingIcon: 'download' },
  { label: 'Bidder Manual Kit & Step-by-Step Video', icon: 'smart_display', trailingIcon: 'open_in_new' },
  { label: 'JRE Compatibility & Browser Prerequisites', icon: 'memory', trailingIcon: 'download' },
  { label: 'Frequently Asked Questions (FAQ)', icon: 'quiz', trailingIcon: 'chevron_right' },
];

const NOTICES = [
  {
    date: '23 Sep 2026',
    tag: 'Corrigendum',
    tagClass: 'bg-red-600 text-white',
    title: 'Pre-bid clarification for Tender CPCL/PROC/2026/041',
    description: 'Revised technical compliance sheet uploaded for camera sensor specs.',
  },
  {
    date: '22 Sep 2026',
    tag: 'Advisory',
    tagClass: 'bg-red-600 text-white',
    title: 'Mandatory UDIN format verification for Chartered Accountant Certificates',
    description: 'Applicable for all financial turnover submissions w.e.f 01 Oct 2026.',
  },
  {
    date: '20 Sep 2026',
    tag: 'System',
    tagClass: 'bg-slate-200 text-slate-700',
    title: 'Scheduled NIC server maintenance window (Sunday 02:00 to 06:00 IST)',
    description: 'Database synchronization & CCA root certificate upgrades.',
  },
];
