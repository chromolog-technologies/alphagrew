import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  Users, 
  LayoutDashboard, 
  Sparkles, 
  FileText, 
  Send, 
  MapPin, 
  DollarSign, 
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  ChevronRight,
  BrainCircuit,
  Briefcase
} from 'lucide-react';
import { motion } from 'motion/react';
import { User, Job, Application } from '../../types';

interface RecruiterDashboardProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function RecruiterDashboard({ user, activeTab, setActiveTab }: RecruiterDashboardProps) {
  const [jdText, setJdText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [jobsRes, companyRes] = await Promise.all([
        fetch('/api/jobs'),
        fetch(`/api/companies/${user.id}`)
      ]);
      const jobsData = await jobsRes.json();
      const companyData = await companyRes.json();
      setJobs(jobsData);
      setCompany(companyData);
    } catch (err) {
      console.error('Error fetching recruiter data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(data);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
  };

  const handleExtractJD = async () => {
    if (!jdText) return;
    setExtracting(true);
    try {
      const res = await fetch('/api/ai/extract-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdText })
      });
      const data = await res.json();
      setExtractedData(data);
    } catch (err) {
      alert('AI extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  const handlePostJob = async () => {
    if (!company?.id) {
      alert('Company profile not found');
      return;
    }

    const jobData = {
      company_id: company.id,
      title: extractedData?.title || 'New Role',
      description: jdText,
      salary_range: extractedData?.salary_range || 'Competitive',
      location: extractedData?.location || 'Remote',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData)
      });
      if (res.ok) {
        alert('Job posted successfully!');
        setExtractedData(null);
        setJdText('');
        fetchJobs();
      }
    } catch (err) {
      alert('Failed to post job');
    }
  };

  if (loading) return <div>Loading...</div>;

  if (activeTab === 'dashboard') {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-sm text-slate-500 font-medium mb-1">Active Postings</p>
            <h3 className="text-3xl font-bold text-slate-900">{jobs.length}</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-sm text-slate-500 font-medium mb-1">Total Applicants</p>
            <h3 className="text-3xl font-bold text-slate-900">124</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-sm text-slate-500 font-medium mb-1">Interviews Scheduled</p>
            <h3 className="text-3xl font-bold text-slate-900">18</h3>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Your Job Postings</h3>
            <button className="text-indigo-600 text-sm font-bold hover:underline">View All</button>
          </div>
          <div className="divide-y divide-slate-100">
            {jobs.map(job => (
              <div key={job.id} className="p-6 hover:bg-slate-50 transition-all flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <Briefcase size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{job.title}</h4>
                    <p className="text-sm text-slate-500">{job.location} • {job.salary_range}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-xs text-slate-400 mb-1">Applicants</p>
                    <p className="font-bold text-slate-900">12</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400 mb-1">Status</p>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">Open</span>
                  </div>
                  <button className="p-2 text-slate-400 hover:text-indigo-600 transition-all">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'post-job') {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">AI-Powered Job Creation</h3>
          </div>
          
          <p className="text-slate-500 mb-6">Paste your Job Description below and our AI will automatically extract key details and set eligibility rules.</p>
          
          <textarea 
            className="w-full h-64 p-6 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all mb-6"
            placeholder="Paste Job Description here..."
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
          ></textarea>
          
          <button 
            onClick={handleExtractJD}
            disabled={extracting || !jdText}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
          >
            {extracting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Analyzing JD...
              </>
            ) : (
              <>
                <BrainCircuit size={20} />
                Extract Details with AI
              </>
            )}
          </button>
        </div>

        {extractedData && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-3xl border border-indigo-100 shadow-xl shadow-indigo-50"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-6">Extracted Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Job Title</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                  value={extractedData.title}
                  onChange={(e) => setExtractedData({...extractedData, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Location</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                  value={extractedData.location}
                  onChange={(e) => setExtractedData({...extractedData, location: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Salary Range</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                  value={extractedData.salary_range}
                  onChange={(e) => setExtractedData({...extractedData, salary_range: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Min CGPA Requirement</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                  value={extractedData.eligibility_rules?.cgpa || '7.0'}
                />
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Required Skills (AI Identified)</label>
              <div className="flex flex-wrap gap-2">
                {(extractedData.eligibility_rules?.skills || ['React', 'Node.js', 'SQL']).map((skill: string, i: number) => (
                  <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <button 
              onClick={handlePostJob}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
            >
              <Send size={20} />
              Confirm & Post Job
            </button>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center">
      <h3 className="text-xl font-bold text-slate-900 mb-2">Module Under Development</h3>
      <p className="text-slate-500">The {activeTab} module is coming soon.</p>
    </div>
  );
}
