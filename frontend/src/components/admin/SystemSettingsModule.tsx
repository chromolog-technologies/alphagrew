import React, { useState } from 'react';
import { Settings, Save, Bell, Mail, Lock, Palette, Database } from 'lucide-react';

interface SystemSettings {
  collegeName: string;
  collegeAddress: string;
  collegePhone: string;
  collegeEmail: string;
  academicYearStart: string;
  academicYearEnd: string;
  currentSemester: number;
  maintenanceMode: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  backupFrequency: string;
  theme: 'light' | 'dark' | 'auto';
}

export const SystemSettingsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'backup' | 'appearance'>('general');
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({
    collegeName: 'AlphaGrew Campus Management',
    collegeAddress: '123 Education Street, City',
    collegePhone: '+1-800-123-4567',
    collegeEmail: 'admin@alphagrew.edu',
    academicYearStart: '2026-06-01',
    academicYearEnd: '2027-05-31',
    currentSemester: 1,
    maintenanceMode: false,
    emailNotifications: true,
    smsNotifications: false,
    backupFrequency: 'daily',
    theme: 'light',
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">System Settings</h2>
        <p className="mt-1 text-sm text-slate-600">Configure system preferences and general settings</p>
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check size={20} />
          Settings saved successfully!
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 font-semibold transition ${
            activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Settings size={16} /> General
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 font-semibold transition ${
            activeTab === 'notifications' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bell size={16} /> Notifications
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 font-semibold transition ${
            activeTab === 'backup' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database size={16} /> Backup
        </button>
        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 font-semibold transition ${
            activeTab === 'appearance' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Palette size={16} /> Appearance
        </button>
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1">College Name</label>
              <input
                type="text"
                value={settings.collegeName}
                onChange={(e) => setSettings({ ...settings, collegeName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1">Address</label>
              <textarea
                value={settings.collegeAddress}
                onChange={(e) => setSettings({ ...settings, collegeAddress: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1">Phone</label>
                <input
                  type="tel"
                  value={settings.collegePhone}
                  onChange={(e) => setSettings({ ...settings, collegePhone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1">Email</label>
                <input
                  type="email"
                  value={settings.collegeEmail}
                  onChange={(e) => setSettings({ ...settings, collegeEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1">Academic Year Start</label>
                <input
                  type="date"
                  value={settings.academicYearStart}
                  onChange={(e) => setSettings({ ...settings, academicYearStart: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1">Academic Year End</label>
                <input
                  type="date"
                  value={settings.academicYearEnd}
                  onChange={(e) => setSettings({ ...settings, academicYearEnd: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1">Current Semester</label>
              <select
                value={settings.currentSemester}
                onChange={(e) => setSettings({ ...settings, currentSemester: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300"
              />
              <label className="font-semibold text-slate-900">Enable Maintenance Mode</label>
            </div>
          </div>
          <button onClick={handleSave} className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            <Save size={18} /> Save Changes
          </button>
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-4">
          <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <Mail size={20} className="text-blue-600" />
              <div>
                <p className="font-semibold text-slate-900">Email Notifications</p>
                <p className="text-sm text-slate-600">Send notifications via email</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
              className="w-6 h-6 rounded border-slate-300 cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <Bell size={20} className="text-green-600" />
              <div>
                <p className="font-semibold text-slate-900">SMS Notifications</p>
                <p className="text-sm text-slate-600">Send notifications via SMS</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.smsNotifications}
              onChange={(e) => setSettings({ ...settings, smsNotifications: e.target.checked })}
              className="w-6 h-6 rounded border-slate-300 cursor-pointer"
            />
          </div>
          <button onClick={handleSave} className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            <Save size={18} /> Save Changes
          </button>
        </div>
      )}

      {/* Backup */}
      {activeTab === 'backup' && (
        <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Backup Frequency</label>
            <select
              value={settings.backupFrequency}
              onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="hourly">Every Hour</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <button className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
            <Database size={18} /> Create Backup Now
          </button>
          <button onClick={handleSave} className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            <Save size={18} /> Save Changes
          </button>
        </div>
      )}

      {/* Appearance */}
      {activeTab === 'appearance' && (
        <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Theme</label>
            <div className="flex gap-4">
              {(['light', 'dark', 'auto'] as const).map((theme) => (
                <label key={theme} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value={theme}
                    checked={settings.theme === theme}
                    onChange={(e) => setSettings({ ...settings, theme: e.target.value as 'light' | 'dark' | 'auto' })}
                    className="w-4 h-4"
                  />
                  <span className="capitalize font-medium text-slate-900">{theme}</span>
                </label>
              ))}
            </div>
          </div>
          <button onClick={handleSave} className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            <Save size={18} /> Save Changes
          </button>
        </div>
      )}
    </div>
  );
};

const Check = ({ size }: { size: number }) => {
  return <span>✓</span>;
};
