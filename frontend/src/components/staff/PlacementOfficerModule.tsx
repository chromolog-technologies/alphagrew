import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Briefcase, Users, TrendingUp, MapPin, Calendar, Award, Building2 } from 'lucide-react';
import { fetchPlacementDrives, createPlacementDrive, updatePlacementDrive, fetchPlacementStatistics } from '../../api/campusApi';

const AUTH_KEY = 'chromolog-campus-auth';

function getTokenFromStorage(): string | null {
  const legacyToken = localStorage.getItem('auth_token');
  if (legacyToken) {
    return legacyToken;
  }

  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed.token ?? null;
  } catch {
    return null;
  }
}

interface PlacementDriveRecord {
  id: number;
  name: string;
  company_name?: string;
  role: string;
  position?: string;
  package_offered: string;
  package?: string;
  drive_date?: string;
  status: string;
  location?: string;
  type?: string;
  job_type?: string;
  applicants?: number;
  shortlisted?: number;
  eligible_departments?: string[] | string;
  eligibility?: string;
  created_at?: string;
}

export const PlacementOfficerModule: React.FC = () => {
  const [drives, setDrives] = useState<PlacementDriveRecord[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'companies' | 'jobs' | 'interviews'>('companies');
  
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [isAddingJob, setIsAddingJob] = useState(false);

  // Form states
  const [companyForm, setCompanyForm] = useState({
    name: '',
    location: '',
    role: '',
    package_offered: '',
    drive_date: '',
    type: 'Full-time',
    eligible_departments: 'CSE, IT, ECE',
  });

  const [jobForm, setJobForm] = useState({
    company_name: '',
    position: '',
    package: '',
    eligibility: 'All Engineering',
    jobType: 'Full-time',
    drive_date: '',
    location: 'Campus',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getTokenFromStorage();
      if (!token) {
        setError('Authentication token not found. Please log in.');
        return;
      }

      const [drivesResponse, statsResponse] = await Promise.all([
        fetchPlacementDrives(token),
        fetchPlacementStatistics(token)
      ]);

      if (drivesResponse?.data) {
        const drivesList = Array.isArray(drivesResponse.data)
          ? drivesResponse.data
          : drivesResponse.data.drives || [];
        setDrives(drivesList);
      }

      if (statsResponse?.data) {
        setStats(statsResponse.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch placement data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.name || !companyForm.role) {
      setError('Please provide company name and job role.');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      const token = getTokenFromStorage();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const departments = companyForm.eligible_departments
        ? companyForm.eligible_departments.split(',').map(d => d.trim()).filter(Boolean)
        : [];

      await createPlacementDrive(token, {
        name: companyForm.name,
        role: companyForm.role,
        package_offered: companyForm.package_offered || 'Competitive',
        drive_date: companyForm.drive_date || null,
        location: companyForm.location || 'On-Campus',
        type: companyForm.type,
        eligible_departments: departments,
        status: 'upcoming',
      });

      setSuccessMessage(`Drive for ${companyForm.name} created successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setIsAddingCompany(false);
      setCompanyForm({
        name: '',
        location: '',
        role: '',
        package_offered: '',
        drive_date: '',
        type: 'Full-time',
        eligible_departments: 'CSE, IT, ECE',
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create company drive');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobForm.company_name || !jobForm.position) {
      setError('Please provide company name and job position.');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      const token = getTokenFromStorage();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const departments = jobForm.eligibility
        ? jobForm.eligibility.split(',').map(d => d.trim()).filter(Boolean)
        : [];

      await createPlacementDrive(token, {
        name: jobForm.company_name,
        role: jobForm.position,
        package_offered: jobForm.package || 'Competitive',
        drive_date: jobForm.drive_date || null,
        location: jobForm.location || 'Campus',
        type: jobForm.jobType,
        eligible_departments: departments,
        status: 'upcoming',
      });

      setSuccessMessage(`Job posting for ${jobForm.company_name} - ${jobForm.position} created.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setIsAddingJob(false);
      setJobForm({
        company_name: '',
        position: '',
        package: '',
        eligibility: 'All Engineering',
        jobType: 'Full-time',
        drive_date: '',
        location: 'Campus',
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post job');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (driveId: number, newStatus: string) => {
    try {
      setActionLoading(true);
      const token = getTokenFromStorage();
      if (!token) return;

      await updatePlacementDrive(token, driveId, { status: newStatus });
      setSuccessMessage(`Drive status updated to ${newStatus}.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'upcoming' || s === 'open' || s === 'active') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (s === 'ongoing') {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (s === 'completed') {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (s === 'cancelled' || s === 'closed' || s === 'inactive') {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  if (loading && drives.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading placement data...</p>
        </div>
      </div>
    );
  }

  const placementStats = [
    {
      label: 'Total Drives',
      value: stats?.total_drives ?? drives.length,
      color: 'blue',
      icon: <Briefcase size={28} className="text-blue-600" />,
    },
    {
      label: 'Placement Rate',
      value: stats?.placement_rate != null ? `${stats.placement_rate}%` : '0%',
      color: 'green',
      icon: <TrendingUp size={28} className="text-green-600" />,
    },
    { 
      label: 'Avg Package', 
      value: stats?.average_package ? `${stats.average_package} LPA` : '0 LPA', 
      color: 'purple', 
      icon: <Award size={28} className="text-purple-600" /> 
    },
    { 
      label: 'Placed Students', 
      value: stats?.placed_students != null ? stats.placed_students : 0, 
      color: 'amber', 
      icon: <Users size={28} className="text-amber-600" /> 
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Placement Management</h2>
          <p className="mt-1 text-sm text-slate-600">Manage companies, recruitment drives, job postings, and student placements</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setIsAddingCompany(true); setIsAddingJob(false); setActiveTab('companies'); }}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition"
          >
            <Plus size={16} />
            Add Company Drive
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-900 font-semibold">✕</button>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-emerald-800 text-sm">
          {successMessage}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {placementStats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('companies')}
          className={`px-4 py-3 font-medium border-b-2 text-sm transition ${
            activeTab === 'companies'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <Building2 size={16} />
            Company Drives ({drives.length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-3 font-medium border-b-2 text-sm transition ${
            activeTab === 'jobs'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <Briefcase size={16} />
            Job Postings
          </span>
        </button>
        <button
          onClick={() => setActiveTab('interviews')}
          className={`px-4 py-3 font-medium border-b-2 text-sm transition ${
            activeTab === 'interviews'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <Calendar size={16} />
            Drive Schedule
          </span>
        </button>
      </div>

      {/* Companies Tab */}
      {activeTab === 'companies' && (
        <div className="space-y-4">
          {isAddingCompany && (
            <form onSubmit={handleCreateCompany} className="bg-slate-50 border border-blue-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 text-base flex items-center gap-2">
                <Building2 size={18} className="text-blue-600" />
                Add New Company & Recruitment Drive
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Infosys Technologies"
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Target Role / Position *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Associate Software Engineer"
                    value={companyForm.role}
                    onChange={(e) => setCompanyForm({ ...companyForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Package Offered</label>
                  <input
                    type="text"
                    placeholder="e.g., 6.5 LPA"
                    value={companyForm.package_offered}
                    onChange={(e) => setCompanyForm({ ...companyForm, package_offered: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Drive Date</label>
                  <input
                    type="date"
                    value={companyForm.drive_date}
                    onChange={(e) => setCompanyForm({ ...companyForm, drive_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g., Bengaluru / Hybrid"
                    value={companyForm.location}
                    onChange={(e) => setCompanyForm({ ...companyForm, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Job Type</label>
                  <select
                    value={companyForm.type}
                    onChange={(e) => setCompanyForm({ ...companyForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Internship">Internship</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Eligible Departments (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g., CSE, IT, ECE, EEE"
                    value={companyForm.eligible_departments}
                    onChange={(e) => setCompanyForm({ ...companyForm, eligible_departments: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Drive'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingCompany(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-800 text-sm font-medium rounded-lg hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {drives.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50">
              <Building2 size={36} className="mx-auto text-slate-400 mb-2" />
              <h3 className="font-semibold text-slate-700">No recruitment drives registered yet</h3>
              <p className="text-sm text-slate-500 mt-1">Add your first partnering company drive above to start organizing campus placements.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {drives.map((drive) => {
                const name = drive.name || drive.company_name;
                const role = drive.role || drive.position || 'Recruitment Drive';
                const pkg = drive.package_offered || drive.package || 'Not specified';
                const status = drive.status || 'upcoming';
                const location = drive.location || 'Campus';
                const applicants = drive.applicants ?? 0;

                return (
                  <div key={drive.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-md transition">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-slate-900 text-lg">{name}</h4>
                        <p className="text-sm text-slate-600 font-medium">{role}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getStatusBadge(status)}`}>
                        {status.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-sm text-slate-600 mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin size={15} className="text-slate-400" />
                        <span>{location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Award size={15} className="text-slate-400" />
                        <span>Package: <strong className="text-slate-800">{pkg}</strong></span>
                      </div>
                      {drive.drive_date && (
                        <div className="flex items-center gap-2">
                          <Calendar size={15} className="text-slate-400" />
                          <span>Date: {drive.drive_date}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users size={15} className="text-slate-400" />
                        <span>Applicants: {applicants}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      {status !== 'completed' && (
                        <button
                          disabled={actionLoading}
                          onClick={() => handleStatusChange(drive.id, 'completed')}
                          className="flex-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-medium transition"
                        >
                          Mark Completed
                        </button>
                      )}
                      {status !== 'cancelled' && status !== 'closed' && (
                        <button
                          disabled={actionLoading}
                          onClick={() => handleStatusChange(drive.id, 'closed')}
                          className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-medium transition"
                        >
                          Close Drive
                        </button>
                      )}
                      {(status === 'cancelled' || status === 'closed') && (
                        <button
                          disabled={actionLoading}
                          onClick={() => handleStatusChange(drive.id, 'upcoming')}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition"
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <button
            onClick={() => setIsAddingJob(!isAddingJob)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition"
          >
            <Plus size={16} />
            Post New Job Opening
          </button>

          {isAddingJob && (
            <form onSubmit={handlePostJob} className="bg-slate-50 border border-blue-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 text-base">Create New Job Posting</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Company *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Tata Consultancy Services"
                    value={jobForm.company_name}
                    onChange={(e) => setJobForm({ ...jobForm, company_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Position / Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Software Development Engineer"
                    value={jobForm.position}
                    onChange={(e) => setJobForm({ ...jobForm, position: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Package (CTC)</label>
                  <input
                    type="text"
                    placeholder="e.g., 7 - 9 LPA"
                    value={jobForm.package}
                    onChange={(e) => setJobForm({ ...jobForm, package: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Eligibility Criteria</label>
                  <input
                    type="text"
                    placeholder="e.g., B.Tech CSE / IT, CGPA > 7.0"
                    value={jobForm.eligibility}
                    onChange={(e) => setJobForm({ ...jobForm, eligibility: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Job Type</label>
                  <select
                    value={jobForm.jobType}
                    onChange={(e) => setJobForm({ ...jobForm, jobType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Internship">Internship</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Drive / Interview Date</label>
                  <input
                    type="date"
                    value={jobForm.drive_date}
                    onChange={(e) => setJobForm({ ...jobForm, drive_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                >
                  {actionLoading ? 'Posting...' : 'Post Job'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingJob(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {drives.map((job) => {
              const title = job.role || job.position || 'Recruitment Opportunity';
              const company = job.name || job.company_name;
              const pkg = job.package_offered || job.package || 'Competitive';
              const eligibility = job.eligibility || 'All eligible students';
              const jobType = job.type || job.job_type || 'Full-time';
              const applicants = job.applicants ?? 0;
              const status = job.status || 'open';

              return (
                <div key={job.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-sm transition">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{title}</h4>
                      <p className="text-sm text-slate-600 mt-0.5">{company}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getStatusBadge(status)}`}>
                      {status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <p className="text-slate-500 uppercase tracking-wider font-medium">Package</p>
                      <p className="font-semibold text-slate-900 mt-0.5">{pkg}</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <p className="text-slate-500 uppercase tracking-wider font-medium">Eligibility</p>
                      <p className="font-semibold text-slate-900 mt-0.5 truncate">{eligibility}</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <p className="text-slate-500 uppercase tracking-wider font-medium">Type</p>
                      <p className="font-semibold text-slate-900 mt-0.5">{jobType}</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <p className="text-slate-500 uppercase tracking-wider font-medium">Applicants</p>
                      <p className="font-semibold text-blue-600 mt-0.5">{applicants}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusChange(job.id, status === 'closed' ? 'upcoming' : 'closed')}
                      className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium transition"
                    >
                      {status === 'closed' ? 'Reopen Opening' : 'Close Opening'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Drive Schedule Tab */}
      {activeTab === 'interviews' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h3 className="font-bold text-slate-900 mb-4 text-base flex items-center gap-2">
            <Calendar size={18} className="text-blue-600" />
            Recruitment Drive Schedule & Interview Events
          </h3>
          <div className="space-y-3">
            {drives.filter(d => d.drive_date || d.status === 'upcoming' || d.status === 'ongoing').length === 0 ? (
              <p className="text-sm text-slate-500">No scheduled drives found. Create a drive with a date to display it on the schedule.</p>
            ) : (
              drives
                .filter(d => d.drive_date || d.status === 'upcoming' || d.status === 'ongoing')
                .map((drive) => (
                  <div key={drive.id} className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition">
                    <div>
                      <h5 className="font-semibold text-slate-900">{drive.name || drive.company_name}</h5>
                      <p className="text-sm text-slate-600 mt-0.5">{drive.role || drive.position || 'Recruitment'}</p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <Calendar size={13} />
                        {drive.drive_date ? `Date: ${drive.drive_date}` : 'Date to be announced'}
                        <span className="text-slate-300">|</span>
                        <MapPin size={13} />
                        {drive.location || 'Campus'}
                      </p>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadge(drive.status)}`}>
                        {drive.status.toUpperCase()}
                      </span>
                      <p className="text-xs text-slate-500 mt-1.5">
                        {drive.applicants ?? 0} registered candidates
                      </p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

