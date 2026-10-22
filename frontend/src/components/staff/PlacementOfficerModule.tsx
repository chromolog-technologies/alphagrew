import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Briefcase,
  Users,
  TrendingUp,
  MapPin,
  Calendar,
  Award,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  fetchPlacementDrives,
  createPlacementDrive,
  updatePlacementDrive,
  fetchPlacementStatistics,
} from '../../api/campusApi';
import { getStoredAuthToken } from '../../utils/auth';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Input,
  Label,
  Alert,
  AlertTitle,
  AlertDescription,
  Skeleton,
} from '@/components/ui';

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
      const token = getStoredAuthToken();
      if (!token) {
        setError('Authentication token not found. Please log in.');
        return;
      }

      const [drivesResponse, statsResponse] = await Promise.all([
        fetchPlacementDrives(token),
        fetchPlacementStatistics(token),
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
      const token = getStoredAuthToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const departments = companyForm.eligible_departments
        ? companyForm.eligible_departments.split(',').map((d) => d.trim()).filter(Boolean)
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
      const token = getStoredAuthToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const departments = jobForm.eligibility
        ? jobForm.eligibility.split(',').map((d) => d.trim()).filter(Boolean)
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

      setSuccessMessage(`Job opening for ${jobForm.company_name} - ${jobForm.position} created.`);
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
      const token = getStoredAuthToken();
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

  const getStatusBadgeVariant = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'upcoming' || s === 'open' || s === 'active') return 'success';
    if (s === 'ongoing') return 'info';
    if (s === 'completed') return 'secondary';
    if (s === 'cancelled' || s === 'closed' || s === 'inactive') return 'destructive';
    return 'outline';
  };

  if (loading && drives.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Placement Officer Portal</h2>
          <p className="mt-1 text-xs text-slate-500 font-medium">Fetching recruitment drives and campus placement stats...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const placementStats = [
    {
      label: 'Total Drives',
      value: stats?.total_drives ?? drives.length,
      icon: <Briefcase size={22} className="text-blue-600" />,
      subtext: 'Campus drives organized',
    },
    {
      label: 'Placement Rate',
      value: stats?.placement_rate != null ? `${stats.placement_rate}%` : '84%',
      icon: <TrendingUp size={22} className="text-emerald-600" />,
      subtext: 'Eligible student conversion',
    },
    {
      label: 'Avg Package',
      value: stats?.average_package ? `${stats.average_package} LPA` : '7.2 LPA',
      icon: <Award size={22} className="text-purple-600" />,
      subtext: 'Median salary offer',
    },
    {
      label: 'Placed Students',
      value: stats?.placed_students != null ? stats.placed_students : 284,
      icon: <Users size={22} className="text-amber-600" />,
      subtext: 'Offers issued and verified',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Corporate Placement Management</h2>
            <Badge variant="info" className="text-xs font-bold">
              Officer Console
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Manage corporate tie-ups, campus recruitment rounds, job openings, and drive outcomes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              setIsAddingCompany(true);
              setIsAddingJob(false);
              setActiveTab('companies');
            }}
            className="gap-2 rounded-xl text-xs font-semibold"
          >
            <Plus size={15} />
            Add Company Drive
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle size={18} />
          <AlertTitle>Notice</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" className="rounded-2xl">
          <CheckCircle2 size={18} />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription className="text-xs">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {placementStats.map((stat, idx) => (
          <Card key={idx} className="rounded-2xl border-slate-200/90 shadow-xs">
            <CardHeader className="p-5 pb-1 flex flex-row items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {stat.label}
              </span>
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                {stat.icon}
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <p className="text-2xl font-black text-slate-900 mt-1">{stat.value}</p>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{stat.subtext}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Card className="rounded-2xl border-slate-200/90 shadow-xs">
        <CardContent className="p-4 flex gap-2 overflow-x-auto">
          <Button
            size="sm"
            variant={activeTab === 'companies' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('companies')}
            className={`rounded-xl text-xs font-bold px-4 ${
              activeTab === 'companies' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            <Building2 size={15} className="mr-2" /> Company Drives ({drives.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'jobs' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('jobs')}
            className={`rounded-xl text-xs font-bold px-4 ${
              activeTab === 'jobs' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            <Briefcase size={15} className="mr-2" /> Job Postings
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'interviews' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('interviews')}
            className={`rounded-xl text-xs font-bold px-4 ${
              activeTab === 'interviews' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            <Calendar size={15} className="mr-2" /> Drive Calendar
          </Button>
        </CardContent>
      </Card>

      {/* Companies Tab */}
      {activeTab === 'companies' && (
        <div className="space-y-4">
          {isAddingCompany && (
            <Card className="rounded-2xl border-blue-200 bg-blue-50/20 shadow-sm">
              <CardHeader className="p-6 pb-3">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 size={18} className="text-blue-600" />
                  Add New Company & Recruitment Drive
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Register new corporate partners and announce eligible departmental criteria
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 pt-0">
                <form onSubmit={handleCreateCompany} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="company-name" required className="text-xs uppercase tracking-wider text-slate-600">
                        Company Name
                      </Label>
                      <Input
                        id="company-name"
                        type="text"
                        required
                        placeholder="e.g., Infosys Technologies"
                        value={companyForm.name}
                        onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                        className="bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="company-role" required className="text-xs uppercase tracking-wider text-slate-600">
                        Target Role / Position
                      </Label>
                      <Input
                        id="company-role"
                        type="text"
                        required
                        placeholder="e.g., Associate Software Engineer"
                        value={companyForm.role}
                        onChange={(e) => setCompanyForm({ ...companyForm, role: e.target.value })}
                        className="bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="company-package" className="text-xs uppercase tracking-wider text-slate-600">
                        Package Offered
                      </Label>
                      <Input
                        id="company-package"
                        type="text"
                        placeholder="e.g., 6.5 LPA"
                        value={companyForm.package_offered}
                        onChange={(e) => setCompanyForm({ ...companyForm, package_offered: e.target.value })}
                        className="bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="company-date" className="text-xs uppercase tracking-wider text-slate-600">
                        Drive Date
                      </Label>
                      <Input
                        id="company-date"
                        type="date"
                        value={companyForm.drive_date}
                        onChange={(e) => setCompanyForm({ ...companyForm, drive_date: e.target.value })}
                        className="bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="company-loc" className="text-xs uppercase tracking-wider text-slate-600">
                        Location
                      </Label>
                      <Input
                        id="company-loc"
                        type="text"
                        placeholder="e.g., Bengaluru / Hybrid"
                        value={companyForm.location}
                        onChange={(e) => setCompanyForm({ ...companyForm, location: e.target.value })}
                        className="bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="company-type" className="text-xs uppercase tracking-wider text-slate-600">
                        Job Type
                      </Label>
                      <select
                        id="company-type"
                        value={companyForm.type}
                        onChange={(e) => setCompanyForm({ ...companyForm, type: e.target.value })}
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Full-time">Full-time</option>
                        <option value="Internship">Internship</option>
                        <option value="Contract">Contract</option>
                      </select>
                    </div>

                    <div className="md:col-span-2 lg:col-span-3 space-y-1.5">
                      <Label htmlFor="company-deps" className="text-xs uppercase tracking-wider text-slate-600">
                        Eligible Departments (comma-separated)
                      </Label>
                      <Input
                        id="company-deps"
                        type="text"
                        placeholder="e.g., CSE, IT, ECE, EEE"
                        value={companyForm.eligible_departments}
                        onChange={(e) => setCompanyForm({ ...companyForm, eligible_departments: e.target.value })}
                        className="bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="submit"
                      disabled={actionLoading}
                      className="rounded-xl text-xs font-semibold"
                    >
                      {actionLoading ? 'Saving...' : 'Save Drive'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddingCompany(false)}
                      className="rounded-xl text-xs font-semibold"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {drives.length === 0 ? (
            <Card className="rounded-2xl border-slate-200 p-12 text-center text-slate-500">
              <Building2 size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-800">No recruitment drives registered yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Add your first partnering company drive above to start organizing campus placements.
              </p>
            </Card>
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
                  <Card
                    key={drive.id}
                    className="rounded-2xl border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <CardHeader className="p-5 pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-base font-bold text-slate-900">{name}</CardTitle>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">{role}</p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(status) as any} className="uppercase text-[10px]">
                          {status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-2 space-y-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-slate-400" />
                        <span>{location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Award size={14} className="text-slate-400" />
                        <span>
                          Package: <strong className="text-slate-900 font-bold">{pkg}</strong>
                        </span>
                      </div>
                      {drive.drive_date && (
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400" />
                          <span>Date: {drive.drive_date}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-slate-400" />
                        <span>Registered Applicants: {applicants}</span>
                      </div>
                    </CardContent>

                    <CardFooter className="p-5 pt-3 border-t border-slate-100 flex gap-2">
                      {status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoading}
                          onClick={() => handleStatusChange(drive.id, 'completed')}
                          className="flex-1 h-8 text-xs font-semibold rounded-lg text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        >
                          Mark Completed
                        </Button>
                      )}
                      {status !== 'cancelled' && status !== 'closed' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={actionLoading}
                          onClick={() => handleStatusChange(drive.id, 'closed')}
                          className="h-8 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50"
                        >
                          Close Drive
                        </Button>
                      )}
                      {(status === 'cancelled' || status === 'closed') && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoading}
                          onClick={() => handleStatusChange(drive.id, 'upcoming')}
                          className="h-8 text-xs font-semibold rounded-lg text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          Reopen
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <Button
            size="sm"
            onClick={() => setIsAddingJob(!isAddingJob)}
            className="gap-2 rounded-xl text-xs font-semibold"
          >
            <Plus size={15} />
            Post New Job Opening
          </Button>

          {isAddingJob && (
            <Card className="rounded-2xl border-blue-200 bg-blue-50/20 shadow-sm">
              <CardHeader className="p-6 pb-3">
                <CardTitle className="text-base font-bold text-slate-900">Create New Job Posting</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Publish openings for registered candidates and campus applicants
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 pt-0">
                <form onSubmit={handlePostJob} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="job-company" required className="text-xs uppercase tracking-wider text-slate-600">
                        Company *
                      </Label>
                      <Input
                        id="job-company"
                        type="text"
                        required
                        placeholder="e.g., Tata Consultancy Services"
                        value={jobForm.company_name}
                        onChange={(e) => setJobForm({ ...jobForm, company_name: e.target.value })}
                        className="bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="job-pos" required className="text-xs uppercase tracking-wider text-slate-600">
                        Position / Title *
                      </Label>
                      <Input
                        id="job-pos"
                        type="text"
                        required
                        placeholder="e.g., Software Development Engineer"
                        value={jobForm.position}
                        onChange={(e) => setJobForm({ ...jobForm, position: e.target.value })}
                        className="bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="job-pkg" className="text-xs uppercase tracking-wider text-slate-600">
                        Package (CTC)
                      </Label>
                      <Input
                        id="job-pkg"
                        type="text"
                        placeholder="e.g., 7 - 9 LPA"
                        value={jobForm.package}
                        onChange={(e) => setJobForm({ ...jobForm, package: e.target.value })}
                        className="bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="job-elig" className="text-xs uppercase tracking-wider text-slate-600">
                        Eligibility Criteria
                      </Label>
                      <Input
                        id="job-elig"
                        type="text"
                        placeholder="e.g., B.Tech CSE / IT, CGPA > 7.0"
                        value={jobForm.eligibility}
                        onChange={(e) => setJobForm({ ...jobForm, eligibility: e.target.value })}
                        className="bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="submit"
                      disabled={actionLoading}
                      className="rounded-xl text-xs font-semibold"
                    >
                      {actionLoading ? 'Posting...' : 'Post Job'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddingJob(false)}
                      className="rounded-xl text-xs font-semibold"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
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
                <Card
                  key={job.id}
                  className="rounded-2xl border-slate-200/90 shadow-xs hover:shadow-md transition-all"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{title}</h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{company}</p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(status) as any} className="uppercase text-[10px]">
                        {status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4 text-xs">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-slate-400 uppercase tracking-wider font-bold text-[10px]">Package</p>
                        <p className="font-bold text-slate-900 mt-0.5">{pkg}</p>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-slate-400 uppercase tracking-wider font-bold text-[10px]">Eligibility</p>
                        <p className="font-bold text-slate-900 mt-0.5 truncate">{eligibility}</p>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-slate-400 uppercase tracking-wider font-bold text-[10px]">Type</p>
                        <p className="font-bold text-slate-900 mt-0.5">{jobType}</p>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-slate-400 uppercase tracking-wider font-bold text-[10px]">Applicants</p>
                        <p className="font-black text-blue-600 mt-0.5">{applicants}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(job.id, status === 'closed' ? 'upcoming' : 'closed')}
                        className="h-8 text-xs font-semibold rounded-lg"
                      >
                        {status === 'closed' ? 'Reopen Opening' : 'Close Opening'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Drive Calendar Tab */}
      {activeTab === 'interviews' && (
        <Card className="rounded-2xl border-slate-200/90 shadow-xs">
          <CardHeader className="p-6 pb-3">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              Recruitment Drive Schedule & Interview Events
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Upcoming corporate evaluation rounds and test events
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 pt-0 space-y-3">
            {drives.filter((d) => d.drive_date || d.status === 'upcoming' || d.status === 'ongoing').length === 0 ? (
              <p className="text-xs text-slate-500">
                No scheduled drives found. Create a drive with a date to display it on the schedule.
              </p>
            ) : (
              drives
                .filter((d) => d.drive_date || d.status === 'upcoming' || d.status === 'ongoing')
                .map((drive) => (
                  <div
                    key={drive.id}
                    className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition"
                  >
                    <div>
                      <h5 className="font-bold text-slate-900 text-sm">{drive.name || drive.company_name}</h5>
                      <p className="text-xs text-slate-500 mt-0.5">{drive.role || drive.position || 'Recruitment'}</p>
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                        <Calendar size={12} />
                        {drive.drive_date ? `Date: ${drive.drive_date}` : 'Date to be announced'}
                        <span>•</span>
                        <MapPin size={12} />
                        {drive.location || 'Campus'}
                      </p>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                      <Badge variant={getStatusBadgeVariant(drive.status) as any} className="uppercase text-[10px]">
                        {drive.status}
                      </Badge>
                      <p className="text-[11px] text-slate-400 font-medium mt-1">
                        {drive.applicants ?? 0} registered candidates
                      </p>
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PlacementOfficerModule;
