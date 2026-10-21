import React, { useState, useEffect } from 'react';
import {
  User,
  GraduationCap,
  BookOpen,
  Award,
  Briefcase,
  Code,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  Trash2,
  Pencil,
  Loader,
  Camera,
  MapPin,
  Mail,
  Phone,
  Globe,
  Github,
  Linkedin,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import {
  fetchMyProfile,
  updateMyProfile,
  uploadMyProfilePhoto,
  fetchMyAcademics,
  saveMyEducation,
  deleteMyEducation,
  fetchMySkills,
  updateMySkills,
  deleteMySkill,
  fetchSkillsCatalogue,
  fetchMyProjects,
  saveMyProject,
  deleteMyProject,
  fetchMyCertifications,
  saveMyCertification,
  deleteMyCertification,
  fetchMyExperience,
  saveMyExperience,
  deleteMyExperience
} from '../../api/campusApi';

const AUTH_KEY = 'chromolog-campus-auth';

function getTokenFromStorage(): string | null {
  const legacyToken = localStorage.getItem('auth_token');
  if (legacyToken) return legacyToken;
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed.token ?? null;
  } catch {
    return null;
  }
}

export const StudentCareerProfile: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'academics' | 'skills' | 'projects' | 'experience'>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile state
  const [profile, setProfile] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({
    headline: '',
    about: '',
    phone: '',
    alternateEmail: '',
    city: '',
    state: '',
    country: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
    preferredRoles: [] as string[],
    preferredLocations: [] as string[],
    willingToRelocate: true,
    visibility: {
      contact: false,
      academics: true,
      projects: true,
      skills: true,
      experience: true,
    } as Record<string, boolean>,
  });

  // Academics state
  const [academics, setAcademics] = useState<any>(null);
  const [educationList, setEducationList] = useState<any[]>([]);
  const [eduModalOpen, setEduModalOpen] = useState(false);
  const [eduForm, setEduForm] = useState({
    id: undefined as number | undefined,
    level: 'class_12' as 'class_10' | 'class_12' | 'diploma' | 'ug' | 'pg',
    boardOrUniversity: '',
    institutionName: '',
    yearOfPassing: new Date().getFullYear(),
    scoreType: 'percentage' as 'percentage' | 'cgpa',
    score: 85,
  });

  // Skills state
  const [skills, setSkills] = useState<any[]>([]);
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [selectedCatalogueSkill, setSelectedCatalogueSkill] = useState<number | null>(null);
  const [skillLevel, setSkillLevel] = useState<number>(3);

  // Projects state
  const [projects, setProjects] = useState<any[]>([]);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({
    id: undefined as number | undefined,
    title: '',
    description: '',
    techStack: '',
    url: '',
    startDate: '',
    endDate: '',
  });

  // Certifications & Experience
  const [certifications, setCertifications] = useState<any[]>([]);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certForm, setCertForm] = useState({
    id: undefined as number | undefined,
    name: '',
    issuer: '',
    issuedOn: '',
    expiresOn: '',
    credentialUrl: '',
  });

  const [experience, setExperience] = useState<any[]>([]);
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [expForm, setExpForm] = useState({
    id: undefined as number | undefined,
    type: 'internship' as 'internship' | 'job' | 'freelance',
    organisation: '',
    role: '',
    startDate: '',
    endDate: '',
    description: '',
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const token = getTokenFromStorage();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [profRes, acadRes, skillsRes, catRes, projRes, certRes, expRes] = await Promise.allSettled([
        fetchMyProfile(token),
        fetchMyAcademics(token),
        fetchMySkills(token),
        fetchSkillsCatalogue(token),
        fetchMyProjects(token),
        fetchMyCertifications(token),
        fetchMyExperience(token),
      ]);

      if (profRes.status === 'fulfilled' && profRes.value.data) {
        const p = profRes.value.data;
        setProfile(p);
        setProfileForm({
          headline: p.headline || '',
          about: p.about || '',
          phone: p.phone || '',
          alternateEmail: p.alternateEmail || '',
          city: p.city || '',
          state: p.state || '',
          country: p.country || '',
          linkedinUrl: p.linkedinUrl || '',
          githubUrl: p.githubUrl || '',
          portfolioUrl: p.portfolioUrl || '',
          preferredRoles: p.preferredRoles || [],
          preferredLocations: p.preferredLocations || [],
          willingToRelocate: p.willingToRelocate ?? true,
          visibility: p.visibility || { contact: false, academics: true, projects: true, skills: true },
        });
      }

      if (acadRes.status === 'fulfilled' && acadRes.value.data) {
        setAcademics(acadRes.value.data.summary);
        setEducationList(acadRes.value.data.education || []);
      }

      if (skillsRes.status === 'fulfilled' && skillsRes.value.data) {
        setSkills(skillsRes.value.data);
      }

      if (catRes.status === 'fulfilled' && catRes.value.data) {
        setCatalogue(catRes.value.data);
      }

      if (projRes.status === 'fulfilled' && projRes.value.data) {
        setProjects(projRes.value.data);
      }

      if (certRes.status === 'fulfilled' && certRes.value.data) {
        setCertifications(certRes.value.data);
      }

      if (expRes.status === 'fulfilled' && expRes.value.data) {
        setExperience(expRes.value.data);
      }
    } catch (err: any) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getTokenFromStorage();
    if (!token) return;

    try {
      setSaving(true);
      setMessage(null);
      const res = await updateMyProfile(token, profileForm);
      if (res.data) {
        setProfile(res.data);
        setMessage({ type: 'success', text: 'Career profile updated successfully!' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = getTokenFromStorage();
    if (!token) return;

    try {
      setSaving(true);
      const res = await uploadMyProfilePhoto(token, file);
      if (res.data) {
        setProfile(res.data);
        setMessage({ type: 'success', text: 'Profile photo uploaded successfully!' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to upload photo.' });
    } finally {
      setSaving(false);
    }
  };

  // Education handlers
  const handleSaveEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getTokenFromStorage();
    if (!token) return;

    try {
      setSaving(true);
      await saveMyEducation(token, {
        level: eduForm.level,
        boardOrUniversity: eduForm.boardOrUniversity,
        institutionName: eduForm.institutionName,
        yearOfPassing: Number(eduForm.yearOfPassing),
        scoreType: eduForm.scoreType,
        score: Number(eduForm.score),
      }, eduForm.id);

      setEduModalOpen(false);
      const res = await fetchMyAcademics(token);
      if (res.data) {
        setEducationList(res.data.education || []);
      }
      setMessage({ type: 'success', text: 'Prior education record saved.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save education record.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEducation = async (id: number) => {
    const token = getTokenFromStorage();
    if (!token) return;
    if (!confirm('Are you sure you want to remove this education record?')) return;

    try {
      await deleteMyEducation(token, id);
      setEducationList((prev) => prev.filter((item) => item.id !== id));
      setMessage({ type: 'success', text: 'Education record removed.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete record.' });
    }
  };

  // Skill handlers
  const handleAddSkill = async () => {
    if (!selectedCatalogueSkill) return;
    const token = getTokenFromStorage();
    if (!token) return;

    try {
      setSaving(true);
      const existing = skills.map((s) => ({ skillId: s.skillId, level: s.level }));
      const updated = [...existing.filter((s) => s.skillId !== selectedCatalogueSkill), { skillId: selectedCatalogueSkill, level: skillLevel }];

      const res = await updateMySkills(token, updated);
      if (res.data) {
        setSkills(res.data);
        setSelectedCatalogueSkill(null);
        setMessage({ type: 'success', text: 'Skill added to your profile.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to add skill.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSkill = async (skillId: number) => {
    const token = getTokenFromStorage();
    if (!token) return;

    try {
      await deleteMySkill(token, skillId);
      setSkills((prev) => prev.filter((s) => s.skillId !== skillId));
      setMessage({ type: 'success', text: 'Skill removed.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to remove skill.' });
    }
  };

  // Project handlers
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getTokenFromStorage();
    if (!token) return;

    try {
      setSaving(true);
      await saveMyProject(token, {
        title: projectForm.title,
        description: projectForm.description,
        techStack: projectForm.techStack.split(',').map((s) => s.trim()).filter(Boolean),
        url: projectForm.url || undefined,
        startDate: projectForm.startDate,
        endDate: projectForm.endDate || undefined,
      }, projectForm.id);

      setProjectModalOpen(false);
      const res = await fetchMyProjects(token);
      if (res.data) setProjects(res.data);
      setMessage({ type: 'success', text: 'Project saved.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save project.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (id: number) => {
    const token = getTokenFromStorage();
    if (!token) return;
    if (!confirm('Delete this project?')) return;

    try {
      await deleteMyProject(token, id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setMessage({ type: 'success', text: 'Project deleted.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete project.' });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200">
        <Loader className="animate-spin text-indigo-600 mb-3" size={32} />
        <p className="text-sm font-semibold text-slate-600">Loading student career profile...</p>
      </div>
    );
  }

  const completeness = profile?.completeness?.percent ?? 0;
  const missingSections = profile?.completeness?.missing ?? [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-8 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="h-20 w-20 rounded-2xl bg-indigo-700/60 border-2 border-indigo-400/40 flex items-center justify-center overflow-hidden shadow-inner text-white text-2xl font-black">
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt={profile.name} className="h-full w-full object-cover" />
                ) : (
                  profile?.name?.charAt(0) ?? 'S'
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 p-1.5 bg-white text-slate-900 rounded-xl shadow cursor-pointer hover:bg-slate-100 transition">
                <Camera size={14} />
                <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold">{profile?.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/30 border border-indigo-400/30 text-indigo-200">
                  {profile?.departmentCode}
                </span>
              </div>
              <p className="text-indigo-200 text-sm mt-0.5 font-medium">
                {profile?.headline || 'Add a professional headline (e.g. Full Stack Developer)'}
              </p>
              <p className="text-xs text-indigo-300 mt-1 flex items-center gap-3">
                <span>Reg: {profile?.registrationNumber}</span>
                <span>•</span>
                <span>{profile?.email}</span>
              </p>
            </div>
          </div>

          {/* Profile Completeness Gauge */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 min-w-[240px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">Profile Completeness</span>
              <span className="text-base font-extrabold text-white">{completeness}%</span>
            </div>
            <div className="w-full bg-black/20 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-500"
                style={{ width: `${completeness}%` }}
              />
            </div>
            {missingSections.length > 0 && (
              <p className="text-[11px] text-indigo-200 mt-2 truncate">
                Pending: {missingSections.slice(0, 3).join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto mt-8 pt-4 border-t border-white/10">
          {[
            { id: 'profile', label: 'Career Profile', icon: User },
            { id: 'academics', label: 'Prior Education & CGPA', icon: GraduationCap },
            { id: 'skills', label: 'Skills Catalogue', icon: Code },
            { id: 'projects', label: 'Projects', icon: Briefcase },
            { id: 'experience', label: 'Certifications & Work', icon: Award },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
                  isSelected
                    ? 'bg-white text-indigo-900 shadow-sm'
                    : 'text-indigo-100 hover:bg-white/10'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl border text-sm flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="font-bold ml-4">✕</button>
        </div>
      )}

      {/* TAB 1: CAREER PROFILE & RECRUITER VISIBILITY */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Core Details */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-7 border border-slate-200 shadow-sm space-y-5">
              <h3 className="text-lg font-bold text-slate-900">Career Overview</h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Professional Headline
                </label>
                <input
                  type="text"
                  value={profileForm.headline}
                  onChange={(e) => setProfileForm({ ...profileForm, headline: e.target.value })}
                  placeholder="e.g. Backend Engineer • Java & Node.js"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  About Me / Bio
                </label>
                <textarea
                  rows={4}
                  value={profileForm.about}
                  onChange={(e) => setProfileForm({ ...profileForm, about: e.target.value })}
                  placeholder="Summarize your passions, domain experience, and key accomplishments..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">City</label>
                  <input
                    type="text"
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">State</label>
                  <input
                    type="text"
                    value={profileForm.state}
                    onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Country</label>
                  <input
                    type="text"
                    value={profileForm.country}
                    onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Linkedin size={14} className="text-blue-600" /> LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={profileForm.linkedinUrl}
                    onChange={(e) => setProfileForm({ ...profileForm, linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Github size={14} className="text-slate-900" /> GitHub URL
                  </label>
                  <input
                    type="url"
                    value={profileForm.githubUrl}
                    onChange={(e) => setProfileForm({ ...profileForm, githubUrl: e.target.value })}
                    placeholder="https://github.com/..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Globe size={14} className="text-indigo-600" /> Portfolio URL
                  </label>
                  <input
                    type="url"
                    value={profileForm.portfolioUrl}
                    onChange={(e) => setProfileForm({ ...profileForm, portfolioUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Recruiter Visibility & Preferences */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Recruiter Visibility Controls</h3>
                </div>
                <p className="text-xs text-slate-500">
                  Control which sections are visible to campus recruiters during initial shortlisting.
                </p>

                <div className="space-y-3 pt-2">
                  {[
                    { key: 'contact', label: 'Contact Details (Phone & Email)', default: false },
                    { key: 'academics', label: 'Prior Education & CGPA', default: true },
                    { key: 'projects', label: 'Projects & Work Demos', default: true },
                    { key: 'skills', label: 'Skills & Proficiency Levels', default: true },
                    { key: 'experience', label: 'Internships & Work History', default: true },
                  ].map((item) => {
                    const isVisible = profileForm.visibility[item.key] ?? item.default;
                    return (
                      <div key={item.key} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="font-medium text-slate-800">{item.label}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setProfileForm({
                              ...profileForm,
                              visibility: {
                                ...profileForm.visibility,
                                [item.key]: !isVisible,
                              },
                            });
                          }}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition ${
                            isVisible ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                          {isVisible ? 'Visible' : 'Hidden'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-indigo-50 rounded-3xl p-6 border border-indigo-100 space-y-3">
                <h4 className="font-bold text-indigo-950 text-sm">Job Preferences</h4>
                <label className="flex items-center gap-2 text-xs font-semibold text-indigo-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileForm.willingToRelocate}
                    onChange={(e) => setProfileForm({ ...profileForm, willingToRelocate: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  Willing to relocate for opportunities
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                {saving ? 'Saving Changes...' : 'Save Career Profile'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: PRIOR EDUCATION & DERIVED ACADEMIC SUMMARY */}
      {activeTab === 'academics' && (
        <div className="space-y-6">
          {/* Derived Summary from Published Results */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cumulative CGPA</span>
              <p className="text-3xl font-extrabold text-indigo-600 mt-2">
                {academics?.cgpa !== null && academics?.cgpa !== undefined ? Number(academics.cgpa).toFixed(2) : 'N/A'}
                <span className="text-sm font-normal text-slate-500"> / 10.0</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {academics?.source === 'results' ? 'Derived from published exams' : 'Manual institutional entry'}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Backlogs</span>
              <p className={`text-3xl font-extrabold mt-2 ${academics?.activeBacklogs ? 'text-amber-600' : 'text-emerald-600'}`}>
                {academics?.activeBacklogs ?? 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {academics?.activeBacklogs === 0 ? 'Clear academic standing' : 'Pending re-appear exams'}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attendance</span>
              <p className="text-3xl font-extrabold text-slate-900 mt-2">
                {academics?.attendancePercentage !== null && academics?.attendancePercentage !== undefined
                  ? `${Number(academics.attendancePercentage).toFixed(1)}%`
                  : 'N/A'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Official conducted ratio</p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Published Semesters</span>
              <p className="text-3xl font-extrabold text-slate-900 mt-2">
                {academics?.semestersPublished ?? 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Across {academics?.subjectsPublished ?? 0} locked subjects
              </p>
            </div>
          </div>

          {/* Prior Education Records */}
          <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Prior Education History</h3>
                <p className="text-xs text-slate-500 mt-1">10th, 12th, Diploma, and past undergraduate degrees</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEduForm({
                    id: undefined,
                    level: 'class_12',
                    boardOrUniversity: '',
                    institutionName: '',
                    yearOfPassing: new Date().getFullYear(),
                    scoreType: 'percentage',
                    score: 85,
                  });
                  setEduModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition"
              >
                <Plus size={14} /> Add Education Record
              </button>
            </div>

            {educationList.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl">
                <GraduationCap className="mx-auto text-slate-400 mb-2" size={36} />
                <p className="text-sm font-semibold text-slate-700">No prior education records added</p>
                <p className="text-xs text-slate-500 mt-1">Add your secondary and higher-secondary qualifications for recruiters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {educationList.map((item) => (
                  <div key={item.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          {item.level.replace('_', ' ').toUpperCase()}
                        </span>
                        <h4 className="font-bold text-slate-900 mt-1.5">{item.institutionName}</h4>
                        <p className="text-xs text-slate-600">{item.boardOrUniversity} • Class of {item.yearOfPassing}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEduForm({
                              id: item.id,
                              level: item.level,
                              boardOrUniversity: item.boardOrUniversity,
                              institutionName: item.institutionName,
                              yearOfPassing: item.yearOfPassing,
                              scoreType: item.scoreType,
                              score: item.score,
                            });
                            setEduModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 transition"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEducation(item.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                      <div>
                        <span className="text-slate-500">Score: </span>
                        <span className="font-bold text-slate-900">
                          {item.score} {item.scoreType === 'percentage' ? '%' : 'CGPA'}
                        </span>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                        item.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.verified ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                        {item.verified ? 'Verified by Staff' : 'Self-Reported'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SKILLS CATALOGUE & PROFILE */}
      {activeTab === 'skills' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Skills Profile & Catalogue</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Categorized skills verified across assessments, resumes, and self-ratings.
                </p>
              </div>

              {/* Add Skill Widget */}
              <div className="flex items-center gap-3">
                <select
                  value={selectedCatalogueSkill || ''}
                  onChange={(e) => setSelectedCatalogueSkill(Number(e.target.value) || null)}
                  className="px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">Select skill from catalogue...</option>
                  {catalogue.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.category})
                    </option>
                  ))}
                </select>

                <select
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(Number(e.target.value))}
                  className="px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value={1}>Level 1 - Novice</option>
                  <option value={2}>Level 2 - Beginner</option>
                  <option value={3}>Level 3 - Competent</option>
                  <option value={4}>Level 4 - Proficient</option>
                  <option value={5}>Level 5 - Expert</option>
                </select>

                <button
                  type="button"
                  onClick={handleAddSkill}
                  disabled={!selectedCatalogueSkill || saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  Add Skill
                </button>
              </div>
            </div>

            {skills.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
                <Code className="mx-auto text-slate-400 mb-2" size={36} />
                <p className="text-sm font-semibold text-slate-700">No skills added to your catalogue</p>
                <p className="text-xs text-slate-500 mt-1">Select and add core frameworks, languages, and technical competencies.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {skills.map((s) => (
                  <div key={s.skillId} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white transition space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{s.name}</h4>
                        <span className="text-[11px] text-slate-500 capitalize">{s.category}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSkill(s.skillId)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Proficiency: Level {s.level}/5</span>
                        <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[9px] ${
                          s.source === 'assessment' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {s.source}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full"
                          style={{ width: `${(s.level / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PROJECTS */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Technical Projects</h3>
                <p className="text-xs text-slate-500 mt-1">Showcase your capstone, hackathon, and open-source contributions.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProjectForm({
                    id: undefined,
                    title: '',
                    description: '',
                    techStack: '',
                    url: '',
                    startDate: '',
                    endDate: '',
                  });
                  setProjectModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition"
              >
                <Plus size={14} /> Add Project
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
                <Briefcase className="mx-auto text-slate-400 mb-2" size={36} />
                <p className="text-sm font-semibold text-slate-700">No projects added yet</p>
                <p className="text-xs text-slate-500 mt-1">Highlight web apps, algorithms, or systems you have built.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((proj) => (
                  <div key={proj.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{proj.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {proj.startDate} {proj.endDate ? `to ${proj.endDate}` : '• Ongoing'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {proj.url && (
                          <a href={proj.url} target="_blank" rel="noreferrer" className="p-1.5 text-slate-500 hover:text-indigo-600 transition">
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setProjectForm({
                              id: proj.id,
                              title: proj.title,
                              description: proj.description || '',
                              techStack: (proj.techStack || []).join(', '),
                              url: proj.url || '',
                              startDate: proj.startDate,
                              endDate: proj.endDate || '',
                            });
                            setProjectModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 transition"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(proj.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {proj.description || 'No description provided.'}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200">
                      {(proj.techStack || []).map((t: string) => (
                        <span key={t} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: CERTIFICATIONS & EXPERIENCE */}
      {activeTab === 'experience' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Certifications */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base">Certifications</h3>
                <span className="text-xs text-slate-500">{certifications.length} verified badges</span>
              </div>
              {certifications.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No certifications added yet.</p>
              ) : (
                <div className="space-y-3">
                  {certifications.map((c) => (
                    <div key={c.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                      <p className="font-bold text-slate-900">{c.name}</p>
                      <p className="text-slate-500 mt-0.5">{c.issuer} • Issued {c.issuedOn}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Experience */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base">Work Experience & Internships</h3>
                <span className="text-xs text-slate-500">{experience.length} experiences</span>
              </div>
              {experience.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No internships or jobs recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {experience.map((exp) => (
                    <div key={exp.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{exp.role}</span>
                        <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                          {exp.type}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">{exp.organisation} ({exp.startDate} – {exp.endDate || 'Present'})</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDUCATION MODAL */}
      {eduModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              {eduForm.id ? 'Edit Education Record' : 'Add Education Record'}
            </h3>
            <form onSubmit={handleSaveEducation} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Level</label>
                <select
                  value={eduForm.level}
                  onChange={(e) => setEduForm({ ...eduForm, level: e.target.value as any })}
                  className="w-full mt-1 p-2.5 border rounded-xl"
                >
                  <option value="class_10">Class 10</option>
                  <option value="class_12">Class 12</option>
                  <option value="diploma">Diploma</option>
                  <option value="ug">Undergraduate</option>
                  <option value="pg">Postgraduate</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700">Board or University</label>
                <input
                  type="text"
                  required
                  value={eduForm.boardOrUniversity}
                  onChange={(e) => setEduForm({ ...eduForm, boardOrUniversity: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Institution Name</label>
                <input
                  type="text"
                  required
                  value={eduForm.institutionName}
                  onChange={(e) => setEduForm({ ...eduForm, institutionName: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Passing Year</label>
                  <input
                    type="number"
                    required
                    value={eduForm.yearOfPassing}
                    onChange={(e) => setEduForm({ ...eduForm, yearOfPassing: Number(e.target.value) })}
                    className="w-full mt-1 p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Score ({eduForm.scoreType})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={eduForm.score}
                    onChange={(e) => setEduForm({ ...eduForm, score: Number(e.target.value) })}
                    className="w-full mt-1 p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEduModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROJECT MODAL */}
      {projectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              {projectForm.id ? 'Edit Project' : 'Add Technical Project'}
            </h3>
            <form onSubmit={handleSaveProject} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Project Title</label>
                <input
                  type="text"
                  required
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Tech Stack (comma-separated)</label>
                <input
                  type="text"
                  required
                  placeholder="React, TypeScript, Laravel, MySQL"
                  value={projectForm.techStack}
                  onChange={(e) => setProjectForm({ ...projectForm, techStack: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Project / GitHub URL</label>
                <input
                  type="url"
                  placeholder="https://github.com/..."
                  value={projectForm.url}
                  onChange={(e) => setProjectForm({ ...projectForm, url: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Start Date</label>
                  <input
                    type="date"
                    required
                    value={projectForm.startDate}
                    onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                    className="w-full mt-1 p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">End Date (optional)</label>
                  <input
                    type="date"
                    value={projectForm.endDate}
                    onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })}
                    className="w-full mt-1 p-2.5 border rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700">Description</label>
                <textarea
                  rows={3}
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setProjectModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
