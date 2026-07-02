import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ChevronRight, 
  Building2, 
  MapPin, 
  DollarSign, 
  Calendar,
  Award,
  BookOpen,
  Code,
  FileText,
  Plus,
  GraduationCap
} from 'lucide-react';
import { User, Job, Application, Student } from '../../types';

interface StudentDashboardProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function StudentDashboard({ user, activeTab, setActiveTab }: StudentDashboardProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [studentProfile, setStudentProfile] = useState<Student | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [testAttempts, setTestAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [activeMockTest, setActiveMockTest] = useState<any>(null);
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [showTestResult, setShowTestResult] = useState(false);
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    department: '',
    cgpa: '',
    skills: '',
    projects: '',
    resume_url: ''
  });
  const [profileSubTab, setProfileSubTab] = useState('academic');

  useEffect(() => {
    fetchData();
  }, [user.id]);

  useEffect(() => {
    if (studentProfile) {
      setProfileForm({
        department: studentProfile.department || '',
        cgpa: studentProfile.cgpa?.toString() || '',
        skills: Array.isArray(studentProfile.skills) ? studentProfile.skills.join(', ') : 
                (typeof studentProfile.skills === 'string' ? JSON.parse(studentProfile.skills || '[]').join(', ') : ''),
        projects: Array.isArray(studentProfile.projects) ? studentProfile.projects.join(', ') : 
                  (typeof studentProfile.projects === 'string' ? JSON.parse(studentProfile.projects || '[]').join(', ') : ''),
        resume_url: studentProfile.resume_url || ''
      });
    }
  }, [studentProfile]);

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [jobsRes, profileRes, questionsRes] = await Promise.all([
        fetch('/api/jobs'),
        fetch(`/api/students/${user.id}`),
        fetch('/api/admin/questions')
      ]);
      
      if (!jobsRes.ok || !profileRes.ok || !questionsRes.ok) {
        throw new Error(`Server error`);
      }

      const jobsData = await jobsRes.json();
      const profileData = await profileRes.json();
      const questionsData = await questionsRes.json();
      
      setJobs(Array.isArray(jobsData) ? jobsData : []);
      setStudentProfile(profileData);
      setQuestions(Array.isArray(questionsData) ? questionsData : []);

      if (profileData?.id) {
        const [appsRes, attemptsRes] = await Promise.all([
          fetch(`/api/applications/student/${profileData.id}`),
          fetch(`/api/test-attempts/student/${profileData.id}`)
        ]);
        
        if (appsRes.ok) {
          const appsData = await appsRes.json();
          setApplications(Array.isArray(appsData) ? appsData : []);
        }
        if (attemptsRes.ok) {
          const attemptsData = await attemptsRes.json();
          setTestAttempts(Array.isArray(attemptsData) ? attemptsData : []);
        }
      }
    } catch (err) {
      console.error('Error fetching student data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentProfile?.id) return;

    try {
      const res = await fetch(`/api/students/${studentProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: profileForm.department,
          cgpa: parseFloat(profileForm.cgpa),
          skills: profileForm.skills.split(',').map(s => s.trim()).filter(s => s),
          projects: profileForm.projects.split(',').map(s => s.trim()).filter(s => s),
          resume_url: profileForm.resume_url
        })
      });

      if (res.ok) {
        alert('Profile section updated successfully!');
        fetchData();
      } else {
        alert('Failed to update profile');
      }
    } catch (err) {
      alert('Error updating profile');
    }
  };

  const handleTestSubmit = async () => {
    if (!studentProfile || !activeMockTest) return;

    let score = 0;
    activeMockTest.forEach((q: any) => {
      if (testAnswers[q.id] === q.correct_option) {
        score++;
      }
    });

    try {
      const res = await fetch('/api/test-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentProfile.id,
          score,
          total_questions: activeMockTest.length
        })
      });
      
      if (res.ok) {
        setShowTestResult(true);
        fetchData(); // Refresh attempts
      }
    } catch (error) {
      console.error('Error saving test result:', error);
    }
  };

  const handleApply = async (jobId: number) => {
    if (!studentProfile?.id) return;
    
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, student_id: studentProfile.id })
      });
      
      if (res.ok) {
        alert('Application submitted successfully!');
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to apply');
      }
    } catch (err) {
      alert('Connection error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (activeTab === 'dashboard') {
    return (
      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Briefcase size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Applied Jobs</p>
                <h3 className="text-2xl font-bold text-slate-900">{applications.length}</h3>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Shortlisted</p>
                <h3 className="text-2xl font-bold text-slate-900">
                  {applications.filter(a => a.status === 'shortlisted' || a.status === 'interviewing').length}
                </h3>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <Award size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Offers Received</p>
                <h3 className="text-2xl font-bold text-slate-900">
                  {applications.filter(a => a.status === 'offered').length}
                </h3>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Applications */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Recent Applications</h3>
              <button 
                onClick={() => setActiveTab('applications')}
                className="text-indigo-600 text-sm font-semibold hover:underline"
              >
                View All
              </button>
            </div>
            <div className="space-y-4">
              {applications.length > 0 ? applications.slice(0, 5).map(app => (
                <div key={app.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{app.title}</h4>
                      <p className="text-sm text-slate-500">{app.company_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-slate-400 mb-1">Status</p>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                        app.status === 'offered' ? 'bg-emerald-50 text-emerald-600' :
                        app.status === 'rejected' ? 'bg-red-50 text-red-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                    <ChevronRight className="text-slate-300" size={20} />
                  </div>
                </div>
              )) : (
                <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center">
                  <p className="text-slate-400">No applications yet. Start exploring jobs!</p>
                </div>
              )}
            </div>
          </div>

          {/* Profile Completion */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900">Profile Completion</h3>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-indigo-600">
                  {studentProfile?.profile_completed ? '100%' : '40%'}
                </span>
                <span className="text-xs text-slate-400">Target: 100%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mb-6 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-1000" 
                  style={{ width: studentProfile?.profile_completed ? '100%' : '40%' }}
                ></div>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="text-emerald-500" size={16} />
                  <span className="text-slate-600">Basic Information</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className={studentProfile?.profile_completed ? "text-emerald-500" : "text-slate-300"} size={16} />
                  <span className="text-slate-600">Academic Details</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className={studentProfile?.profile_completed ? "text-emerald-500" : "text-slate-300"} size={16} />
                  <span className="text-slate-600">Skills & Projects</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className={studentProfile?.profile_completed ? "text-emerald-500" : "text-slate-300"} size={16} />
                  <span className="text-slate-600">Resume Upload</span>
                </li>
              </ul>
              {!studentProfile?.profile_completed && (
                <button 
                  onClick={() => setActiveTab('profile')}
                  className="w-full mt-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-all"
                >
                  Complete Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'jobs') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-900">Available Opportunities</h3>
          <div className="flex gap-2">
            <select className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              <option>All Departments</option>
              <option>Computer Science</option>
              <option>Electronics</option>
            </select>
            <select className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              <option>Full Time</option>
              <option>Internship</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {jobs.map(job => {
            const hasApplied = applications.some(a => a.job_id === job.id);
            return (
              <div key={job.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <Building2 size={28} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">{job.title}</h4>
                      <p className="text-indigo-600 font-medium">{job.company_name}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold">
                    New
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <MapPin size={16} className="text-slate-400" />
                    {job.location}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <DollarSign size={16} className="text-slate-400" />
                    {job.salary_range}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Calendar size={16} className="text-slate-400" />
                    Deadline: {new Date(job.deadline).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Award size={16} className="text-slate-400" />
                    Min CGPA: {job.cgpa_required || 6.0}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleApply(job.id)}
                    disabled={hasApplied}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                      hasApplied 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'
                    }`}
                  >
                    {hasApplied ? 'Applied' : 'Apply Now'}
                  </button>
                  <button 
                    onClick={() => setSelectedJob(job)}
                    className="px-4 py-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all"
                  >
                    Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Job Details Modal */}
        {selectedJob && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-8 bg-indigo-600 text-white relative">
                <button 
                  onClick={() => setSelectedJob(null)}
                  className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                >
                  <XCircle size={24} />
                </button>
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-lg">
                    <Building2 size={40} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{selectedJob.title}</h3>
                    <p className="text-indigo-100 text-lg">{selectedJob.company_name}</p>
                  </div>
                </div>
              </div>
              <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Salary</p>
                    <p className="text-sm font-bold text-slate-900">{selectedJob.salary_range}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Location</p>
                    <p className="text-sm font-bold text-slate-900">{selectedJob.location}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Deadline</p>
                    <p className="text-sm font-bold text-slate-900">{new Date(selectedJob.deadline).toLocaleDateString()}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Min CGPA</p>
                    <p className="text-sm font-bold text-slate-900">{selectedJob.cgpa_required || 6.0}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-3">Job Description</h4>
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedJob.description}
                  </p>
                </div>
                {selectedJob.department && (
                  <div>
                    <h4 className="font-bold text-slate-900 mb-3">Target Department</h4>
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold">
                      {selectedJob.department}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
                <button 
                  onClick={() => setSelectedJob(null)}
                  className="px-6 py-3 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-xl transition-all"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    handleApply(selectedJob.id);
                    setSelectedJob(null);
                  }}
                  disabled={applications.some(a => a.job_id === selectedJob.id)}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:bg-slate-300 disabled:shadow-none"
                >
                  {applications.some(a => a.job_id === selectedJob.id) ? 'Already Applied' : 'Apply Now'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'applications') {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-slate-900">My Applications</h3>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-8 py-4">Job Role</th>
                <th className="px-8 py-4">Company</th>
                <th className="px-8 py-4">Applied Date</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.map(app => (
                <tr key={app.id} className="hover:bg-slate-50 transition-all">
                  <td className="px-8 py-5">
                    <span className="font-bold text-slate-900">{app.title}</span>
                  </td>
                  <td className="px-8 py-5 text-sm text-slate-600">{app.company_name}</td>
                  <td className="px-8 py-5 text-sm text-slate-600">
                    {new Date(app.applied_at).toLocaleDateString()}
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                      app.status === 'offered' ? 'bg-emerald-50 text-emerald-600' :
                      app.status === 'rejected' ? 'bg-red-50 text-red-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <button 
                      onClick={() => {
                        const job = jobs.find(j => j.id === app.job_id);
                        if (job) setSelectedJob(job);
                      }}
                      className="text-indigo-600 text-sm font-bold hover:underline"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400">
                    You haven't applied to any jobs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (activeTab === 'profile') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-indigo-600 text-white">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl font-bold border border-white/30">
                {user.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-2xl font-bold">{user.name}</h3>
                <p className="text-indigo-100">{user.email}</p>
                <div className="flex gap-2 mt-3">
                  <span className="px-3 py-1 bg-white/20 rounded-lg text-xs font-bold backdrop-blur-md">
                    Roll: {studentProfile?.roll_number}
                  </span>
                  <span className="px-3 py-1 bg-white/20 rounded-lg text-xs font-bold backdrop-blur-md">
                    {studentProfile?.department || 'Department Not Set'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex border-b border-slate-100">
            {[
              { id: 'academic', label: 'Academic Details', icon: GraduationCap },
              { id: 'skills', label: 'Skills & Projects', icon: Code },
              { id: 'resume', label: 'Resume Upload', icon: FileText },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setProfileSubTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all ${
                  profileSubTab === tab.id
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleUpdateProfile} className="p-8 space-y-8">
            {profileSubTab === 'academic' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Department</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="e.g. Computer Science"
                    value={profileForm.department}
                    onChange={(e) => setProfileForm({...profileForm, department: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Current CGPA</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="e.g. 8.5"
                    value={profileForm.cgpa}
                    onChange={(e) => setProfileForm({...profileForm, cgpa: e.target.value})}
                  />
                </div>
              </div>
            )}

            {profileSubTab === 'skills' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Skills (Comma separated)</label>
                  <textarea 
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                    placeholder="e.g. React, Node.js, Python, SQL"
                    value={profileForm.skills}
                    onChange={(e) => setProfileForm({...profileForm, skills: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Projects (Comma separated)</label>
                  <textarea 
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                    placeholder="e.g. E-commerce App, Portfolio Website, AI Chatbot"
                    value={profileForm.projects}
                    onChange={(e) => setProfileForm({...profileForm, projects: e.target.value})}
                  />
                </div>
              </div>
            )}

            {profileSubTab === 'resume' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-3xl p-12 text-center">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-4 shadow-sm">
                    <Plus size={32} />
                  </div>
                  <h4 className="font-bold text-slate-900 mb-2">Upload New Resume</h4>
                  <p className="text-sm text-slate-500 mb-6">PDF, DOCX up to 5MB</p>
                  <button type="button" className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all">
                    Select File
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Or Provide Resume Link (Google Drive/Dropbox)</label>
                  <input 
                    type="url" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="https://drive.google.com/..."
                    value={profileForm.resume_url}
                    onChange={(e) => setProfileForm({...profileForm, resume_url: e.target.value})}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button 
                type="submit"
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                Save {profileSubTab === 'academic' ? 'Academic' : profileSubTab === 'skills' ? 'Skills' : 'Resume'} Details
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (activeTab === 'mock-tests') {
    if (activeMockTest) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Mock Test in Progress</h3>
            <button 
              onClick={() => setActiveMockTest(null)}
              className="text-slate-500 hover:text-slate-900 font-bold text-sm"
            >
              Cancel Test
            </button>
          </div>
          
          <div className="space-y-8">
            {activeMockTest.map((q: any, idx: number) => (
              <div key={q.id} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex gap-4 mb-6">
                  <span className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                    {idx + 1}
                  </span>
                  <p className="text-lg font-medium text-slate-900">{q.question_text || q.question}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['A', 'B', 'C', 'D'].map(opt => {
                    const optionKey = `option_${opt.toLowerCase()}`;
                    const isSelected = testAnswers[q.id] === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => setTestAnswers(prev => ({ ...prev, [q.id]: opt }))}
                        className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-4 ${
                          isSelected 
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-600 ring-2 ring-indigo-600/20' 
                            : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${
                          isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                        }`}>
                          {opt}
                        </span>
                        {q[optionKey] || `Option ${opt}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center pt-8">
            <button 
              onClick={handleTestSubmit}
              className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all"
            >
              Submit Test
            </button>
          </div>

          {showTestResult && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-3xl w-full max-w-md p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Award size={40} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Test Submitted!</h3>
                <p className="text-slate-500 mb-8">
                  Great job! You've completed the mock test. Your results will be analyzed to help you improve.
                </p>
                <div className="p-4 bg-slate-50 rounded-2xl mb-8">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Score</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {activeMockTest.reduce((acc: number, q: any) => acc + (testAnswers[q.id] === q.correct_option ? 1 : 0), 0)} / {activeMockTest.length}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setActiveMockTest(null);
                    setShowTestResult(false);
                    setTestAnswers({});
                  }}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Mock Interview Preparation</h3>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold">
              {questions.length} Questions Available
            </span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BookOpen size={40} />
          </div>
          <h4 className="text-xl font-bold text-slate-900 mb-2">Ready to test your skills?</h4>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
            Our mock tests are designed to simulate real interview questions from top companies. 
            Take a test now to see where you stand.
          </p>
          <button 
            onClick={() => setActiveMockTest(questions)}
            className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
          >
            Start Full Mock Test
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h4 className="font-bold text-slate-900 mb-4">Test History</h4>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {testAttempts.map((attempt, idx) => (
                <div key={attempt.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Attempt #{testAttempts.length - idx}</p>
                    <p className="text-[10px] text-slate-500">{new Date(attempt.attempted_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-indigo-600">{attempt.score}/{attempt.total_questions}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {Math.round((attempt.score / attempt.total_questions) * 100)}% Success
                    </p>
                  </div>
                </div>
              ))}
              {testAttempts.length === 0 && (
                <p className="text-center text-slate-400 py-8 text-sm italic">No attempts yet.</p>
              )}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h4 className="font-bold text-slate-900 mb-4">Performance Analytics</h4>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Overall Success Rate</span>
                <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-1000" 
                    style={{ width: `${testAttempts.length > 0 ? (testAttempts.reduce((acc, a) => acc + (a.score/a.total_questions), 0) / testAttempts.length * 100) : 0}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Technical Proficiency</span>
                <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="w-[60%] h-full bg-emerald-500"></div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Soft Skills</span>
                <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="w-[85%] h-full bg-amber-500"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center">
      <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <Clock size={40} />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">Coming Soon</h3>
      <p className="text-slate-500">This module is currently under development.</p>
    </div>
  );
}
