import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet, Download, Loader2, ArrowLeft,
  Users, Monitor, CheckCircle2, FileText,
  AlertCircle, LayoutGrid, Settings2,
} from 'lucide-react';
import { getToken } from '../utils/tokenStorage';
import SplitText from '../components/SplitText';

// ---------------------------------------------------------------------------
// Sheet-preview data — describe each sheet that will be generated
// ---------------------------------------------------------------------------
const SHEET_PREVIEWS = [
  {
    icon: Settings2,
    name: 'Summary',
    colour: 'purple',
    desc: 'Plan-level inputs (rows, cols, block width, block structure, broken seats), per-room configuration, and batch breakdown with Paper Set A / B counts.',
  },
  {
    icon: LayoutGrid,
    name: 'Room_<name>  (one per room)',
    colour: 'emerald',
    desc: 'Physical seating grid built from the raw matrix — each cell shows position, roll number + paper set, and student name, colour-coded by batch. Below the grid: full student detail table with batch, degree, branch, joining year, block, and status.',
  },
];

const COLOUR_MAP = {
  purple:  { bg: 'bg-purple-50 dark:bg-purple-900/20',  border: 'border-purple-200 dark:border-purple-800',  icon: 'text-purple-500',  badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',      border: 'border-blue-200 dark:border-blue-800',      icon: 'text-blue-500',    badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', icon: 'text-emerald-500', badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',    border: 'border-amber-200 dark:border-amber-800',    icon: 'text-amber-500',   badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  rose:    { bg: 'bg-rose-50 dark:bg-rose-900/20',      border: 'border-rose-200 dark:border-rose-800',      icon: 'text-rose-500',    badge: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const ExcelExportPage = ({ showToast }) => {
  const { planId } = useParams();
  const navigate = useNavigate();

  const [planInfo, setPlanInfo]       = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [planError, setPlanError]     = useState(null);
  const [exporting, setExporting]     = useState(false);

  // Load plan info (re-uses the existing plan-batches endpoint)
  useEffect(() => {
    const load = async () => {
      setLoadingPlan(true);
      setPlanError(null);
      try {
        const token = getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`/api/plan-batches/${planId}`, { headers });
        if (res.ok) {
          const data = await res.json();
          const meta  = data.metadata || {};
          const rooms = data.rooms    || {};
          const batchCount = Object.values(rooms).reduce(
            (sum, r) => sum + Object.keys(r.batches || {}).length,
            0,
          );
          setPlanInfo({
            total_students: meta.total_students
              || Object.values(rooms).reduce(
                   (sum, r) => sum + Object.values(r.batches || {}).reduce(
                     (s, b) => s + (b.students?.length || 0), 0,
                   ), 0,
                 ),
            room_count:  meta.active_rooms?.length || Object.keys(rooms).length,
            status:      meta.status || '—',
            batch_count: batchCount,
          });
        } else {
          setPlanError('Could not load plan details');
        }
      } catch (err) {
        console.error('Failed to load plan info:', err);
        setPlanError('Could not load plan details');
      } finally {
        setLoadingPlan(false);
      }
    };

    if (planId) load();
  }, [planId]);

  // Trigger download
  const handleExport = async () => {
    setExporting(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/export-excel/${planId}`, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          msg = err.error || err.hint || msg;
        } catch { /* ignore */ }
        throw new Error(msg);
      }

      const blob = await res.blob();
      if (blob.size === 0) throw new Error('Empty response — the plan may have expired.');

      const url = window.URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `seating_plan_${planId}_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      if (showToast) showToast('✅ Excel workbook downloaded!', 'success');
    } catch (err) {
      console.error('Excel export failed:', err);
      if (showToast) showToast(`Export failed: ${err.message}`, 'error');
    } finally {
      setExporting(false);
    }
  };

  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#050505] py-8 px-4 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* ── Hero ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="relative w-3 h-3">
                <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75" />
                <div className="relative w-3 h-3 bg-emerald-500 rounded-full border border-emerald-400" />
              </div>
              <span className="text-xs font-mono text-emerald-500 tracking-wider uppercase">Excel Export</span>
            </div>

            <SplitText
              text="Export to Excel"
              className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 dark:from-gray-100 dark:via-gray-300 dark:to-gray-500 bg-clip-text text-transparent"
              splitType="chars"
              delay={30}
            />
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Download the full seating plan as an Excel workbook (.xlsx)
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">Plan ID</div>
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">{planId}</div>
            </div>
          </div>
        </div>

        {/* ── Plan Info Card ── */}
        {loadingPlan ? (
          <div className="glass-card p-8 border-2 border-gray-200 dark:border-gray-800 rounded-2xl text-center">
            <Loader2 className="w-8 h-8 mx-auto text-emerald-500 animate-spin mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Loading plan details…</p>
          </div>
        ) : planError ? (
          <div className="glass-card p-6 border-2 border-amber-200 dark:border-amber-800 rounded-2xl flex items-center gap-3">
            <AlertCircle className="text-amber-500 flex-shrink-0" size={24} />
            <div>
              <p className="font-bold text-amber-700 dark:text-amber-300">{planError}</p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                Plan preview unavailable, but export may still work if the plan exists in cache.
              </p>
            </div>
          </div>
        ) : planInfo && (
          <div className="glass-card p-6 border-2 border-gray-200 dark:border-gray-800 rounded-2xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Students',  value: planInfo.total_students || 0, Icon: Users,        colour: 'purple' },
                { label: 'Rooms',     value: planInfo.room_count     || 0, Icon: Monitor,      colour: 'blue' },
                { label: 'Status',    value: planInfo.status         || '—', Icon: CheckCircle2, colour: 'emerald' },
                { label: 'Batches',   value: planInfo.batch_count    || '—', Icon: FileText,    colour: 'amber' },
              ].map(({ label, value, Icon, colour }) => {
                const c = COLOUR_MAP[colour];
                return (
                  <div key={label} className={`p-4 ${c.bg} rounded-xl border ${c.border} text-center`}>
                    <Icon className={`w-5 h-5 ${c.icon} mx-auto mb-1`} />
                    <div className={`text-2xl font-black ${c.icon}`}>{value}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-bold">{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Sheets Preview ── */}
        <div className="glass-card p-8 border-2 border-gray-200 dark:border-gray-800 rounded-2xl space-y-5">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-emerald-500" />
            Workbook Contents
          </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
            The downloaded workbook will contain the following sheets:
          </p>

          <div className="space-y-3">
            {SHEET_PREVIEWS.map(({ icon: Icon, name, colour, desc }) => {
              const c = COLOUR_MAP[colour];
              return (
                <div
                  key={name}
                  className={`flex items-start gap-4 p-4 ${c.bg} rounded-xl border ${c.border}`}
                >
                  <div className={`p-2 rounded-lg bg-white/60 dark:bg-black/20 flex-shrink-0`}>
                    <Icon size={18} className={c.icon} />
                  </div>
                  <div className="min-w-0">
                    <span className={`inline-block text-xs font-mono font-bold px-2 py-0.5 rounded ${c.badge} mb-1`}>
                      {name}
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Colour legend (seating grid)</p>
            <div className="flex flex-wrap gap-3 text-xs">
              {[
                { bg: 'bg-[#FF8080]', label: 'Broken seat' },
                { bg: 'bg-[#E9ECEF]', label: 'Unallocated / empty' },
                { bg: 'bg-[#A78BFA]', label: 'Batch colour (example)' },
              ].map(({ bg, label }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span className={`w-3.5 h-3.5 rounded ${bg} flex-shrink-0`} />
                  <span className="text-gray-600 dark:text-gray-400">{label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Export Button ── */}
        <div className="glass-card p-8 border-2 border-gray-200 dark:border-gray-800 rounded-2xl">
          <button
            onClick={handleExport}
            disabled={exporting}
            className={`w-full px-6 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300 ${
              exporting
                ? 'bg-emerald-400 cursor-not-allowed opacity-70'
                : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg hover:shadow-emerald-500/25'
            } text-white`}
          >
            {exporting ? (
              <>
                <Loader2 size={22} className="animate-spin" />
                Generating workbook…
              </>
            ) : (
              <>
                <Download size={22} />
                Download Excel Workbook
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
            Generates a multi-sheet .xlsx file — no additional software required beyond Excel or LibreOffice Calc.
          </p>
        </div>

      </div>

      {/* Scoped glass styles */}
      <style jsx>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
          border-radius: 16px;
          border: 1px solid rgba(100, 116, 139, 0.18);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.6);
        }
        .dark .glass-card {
          position: relative;
          background: rgba(17, 24, 39, 0.55);
          backdrop-filter: blur(14px) saturate(130%);
          border-radius: 16px;
        }
        .dark .glass-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(180deg, rgba(203, 213, 225, 0.22), rgba(203, 213, 225, 0.08));
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default ExcelExportPage;
