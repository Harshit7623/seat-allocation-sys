import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText, Download, Loader2, ArrowLeft, Building2,
  Users, Monitor, PenTool, Calendar, AlertCircle, CheckCircle2
} from 'lucide-react';
import { getToken } from '../utils/tokenStorage';
import SplitText from '../components/SplitText';

const MasterPlanPage = ({ showToast }) => {
  const { planId } = useParams();
  const navigate = useNavigate();

  // Plan info
  const [planInfo, setPlanInfo] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [planError, setPlanError] = useState(null);

  // Form fields
  const [deptName, setDeptName] = useState('Department of Computer Science & Engineering');
  const [examName, setExamName] = useState('Minor-II Examination, November 2025');
  const [dateText, setDateText] = useState('Date: 10th to 14th November, 2025');
  const [title, setTitle] = useState('Master Seating Plan');
  const [leftSignName, setLeftSignName] = useState('');
  const [leftSignTitle, setLeftSignTitle] = useState('Dept. Exam Coordinator');
  const [rightSignName, setRightSignName] = useState('');
  const [rightSignTitle, setRightSignTitle] = useState('Prof. & Head, Department of CSE');

  // Generation state
  const [generating, setGenerating] = useState(false);

  // Load plan info and prefill from template
  useEffect(() => {
    const loadData = async () => {
      setLoadingPlan(true);
      setPlanError(null);

      try {
        const token = getToken();
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Load plan info from plan-batches endpoint (existing)
        const planRes = await fetch(`/api/plan-batches/${planId}`, { headers });
        if (planRes.ok) {
          const planData = await planRes.json();
          const meta = planData.metadata || {};
          const rooms = planData.rooms || {};
          setPlanInfo({
            total_students: meta.total_students || Object.values(rooms).reduce((sum, r) => 
              sum + Object.values(r.batches || {}).reduce((s, b) => s + (b.students?.length || 0), 0), 0),
            room_count: meta.active_rooms?.length || Object.keys(rooms).length,
            status: meta.status || '—',
            batch_count: Object.values(rooms).reduce((sum, r) => sum + Object.keys(r.batches || {}).length, 0),
          });
        }

        // Load template config to prefill form (existing endpoint)
        const tplRes = await fetch('/api/template/config', { headers });
        if (tplRes.ok) {
          const tplData = await tplRes.json();
          if (tplData.success && tplData.template) {
            const tpl = tplData.template;
            if (tpl.dept_name) setDeptName(tpl.dept_name);
            if (tpl.exam_details) setExamName(tpl.exam_details);
            if (tpl.coordinator_name) setLeftSignName(tpl.coordinator_name);
            if (tpl.coordinator_title) setLeftSignTitle(tpl.coordinator_title);
          }
        }
      } catch (err) {
        console.error('Failed to load plan data:', err);
        setPlanError('Could not load plan details');
      } finally {
        setLoadingPlan(false);
      }
    };

    if (planId) loadData();
  }, [planId]);

  // Generate and download PDF
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const token = getToken();
      const response = await fetch('/api/generate-master-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          plan_id: planId,
          dept_name: deptName,
          exam_name: examName,
          date_text: dateText,
          title,
          left_sign_name: leftSignName,
          left_sign_title: leftSignTitle,
          right_sign_name: rightSignName,
          right_sign_title: rightSignTitle,
        }),
      });

      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg = errData.error || errorMsg;
        } catch {
          errorMsg = await response.text() || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      if (blob.size === 0) throw new Error('Empty PDF response');

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `master_plan_${planId}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      if (showToast) showToast('✅ Master Plan PDF downloaded!', 'success');
    } catch (err) {
      console.error('Master Plan generation failed:', err);
      if (showToast) showToast(`Failed: ${err.message}`, 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#050505] py-8 px-4 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Hero Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="relative w-3 h-3">
                <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping opacity-75"></div>
                <div className="relative w-3 h-3 bg-purple-500 rounded-full border border-purple-400"></div>
              </div>
              <span className="text-xs font-mono text-purple-500 tracking-wider uppercase">Master Plan</span>
            </div>
            <SplitText
              text="Master Seating Plan"
              className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 dark:from-gray-100 dark:via-gray-300 dark:to-gray-500 bg-clip-text text-transparent"
              splitType="chars"
              delay={30}
            />
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Generate room-wise enrollment summary PDF
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">Plan ID</div>
              <div className="text-lg font-black text-purple-600 dark:text-purple-400 font-mono">
                {planId}
              </div>
            </div>
          </div>
        </div>

        {/* Plan Info Card */}
        {loadingPlan ? (
          <div className="glass-card p-8 border-2 border-gray-200 dark:border-gray-800 rounded-2xl text-center">
            <Loader2 className="w-8 h-8 mx-auto text-purple-500 animate-spin mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Loading plan details...</p>
          </div>
        ) : planError ? (
          <div className="glass-card p-6 border-2 border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0" size={24} />
            <div>
              <p className="font-bold text-red-700 dark:text-red-300">{planError}</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">Plan data will not be previewed, but you can still generate the PDF.</p>
            </div>
          </div>
        ) : planInfo && (
          <div className="glass-card p-6 border-2 border-gray-200 dark:border-gray-800 rounded-2xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 text-center">
                <Users className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{planInfo.total_students || 0}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 font-bold">Students</div>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 text-center">
                <Monitor className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{planInfo.room_count || 0}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 font-bold">Rooms</div>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{planInfo.status || '—'}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 font-bold">Status</div>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 text-center">
                <FileText className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{planInfo.batch_count || '—'}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 font-bold">Batches</div>
              </div>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="glass-card p-8 border-2 border-gray-200 dark:border-gray-800 rounded-2xl space-y-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <PenTool size={20} className="text-purple-500" />
            PDF Configuration
          </h2>

          {/* Header Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Header Information</h3>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Department Name</label>
              <input
                type="text"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none transition-colors"
                placeholder="Department of Computer Science & Engineering"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Exam Name</label>
              <input
                type="text"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none transition-colors"
                placeholder="Minor-II Examination, November 2025"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none transition-colors"
                  placeholder="Master Seating Plan"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                  <Calendar size={14} />
                  Date
                </label>
                <input
                  type="text"
                  value={dateText}
                  onChange={(e) => setDateText(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none transition-colors"
                  placeholder="Date: 10th to 14th November, 2025"
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Signatures Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Signatures</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Signature */}
              <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Left Signature</p>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={leftSignName}
                    onChange={(e) => setLeftSignName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:border-purple-500 focus:outline-none transition-colors text-sm"
                    placeholder="Dr. Dheeraj K. Dixit"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Title</label>
                  <input
                    type="text"
                    value={leftSignTitle}
                    onChange={(e) => setLeftSignTitle(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:border-purple-500 focus:outline-none transition-colors text-sm"
                    placeholder="Dept. Exam Coordinator"
                  />
                </div>
              </div>

              {/* Right Signature */}
              <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Right Signature</p>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={rightSignName}
                    onChange={(e) => setRightSignName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:border-purple-500 focus:outline-none transition-colors text-sm"
                    placeholder="Dr. Manish Dixit"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Title</label>
                  <input
                    type="text"
                    value={rightSignTitle}
                    onChange={(e) => setRightSignTitle(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:border-purple-500 focus:outline-none transition-colors text-sm"
                    placeholder="Prof. & Head, Department of CSE"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className={`w-full px-6 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300 ${
              generating
                ? 'bg-purple-400 cursor-not-allowed opacity-70'
                : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg hover:shadow-purple-500/25'
            } text-white`}
          >
            {generating ? (
              <>
                <Loader2 size={22} className="animate-spin" />
                Generating Master Plan...
              </>
            ) : (
              <>
                <Download size={22} />
                Generate & Download Master Plan
              </>
            )}
          </button>
        </div>
      </div>

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

export default MasterPlanPage;
