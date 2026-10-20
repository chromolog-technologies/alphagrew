import React, { useState, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Filter, Search, Loader, AlertCircle } from 'lucide-react';
import { fetchStudentNotifications, markNotificationAsRead, deleteNotification, markAllNotificationsAsRead, deleteAllNotifications } from '../../api/campusApi';
import { PrototypeNotice } from '../shared';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'announcement' | 'assignment' | 'grade' | 'attendance' | 'event' | 'system';
  read: boolean;
  timestamp: string;
  icon?: string;
  actionUrl?: string;
}

export const StudentNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    const fetchNotificationsData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('auth_token');
        if (!token) {
          setError('Authentication required. Please log in.');
          return;
        }

        const response = await fetchStudentNotifications(token);

        if (response.success && Array.isArray(response.data)) {
          const notificationsData = response.data.map((n: any, idx: number) => ({
            id: idx + 1,
            title: n.title || 'Notification',
            message: n.message || '',
            type: n.type || 'system',
            read: n.read || false,
            timestamp: n.timestamp || new Date().toISOString(),
            icon: n.icon,
            actionUrl: n.action_url,
          }));
          setNotifications(notificationsData);
        } else {
          setError('Invalid response format or no notifications available.');
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
        setError(err instanceof Error ? err.message : 'Failed to load notifications. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchNotificationsData();
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return '📢';
      case 'assignment':
        return '📝';
      case 'grade':
        return '📊';
      case 'attendance':
        return '📋';
      case 'event':
        return '📅';
      case 'system':
        return '⚙️';
      default:
        return '📌';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'announcement':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'assignment':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'grade':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'attendance':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'event':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'system':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications
    .filter((n) => {
      if (filterType !== 'all' && n.type !== filterType) return false;
      if (showUnreadOnly && n.read) return false;
      if (searchTerm && !n.title.toLowerCase().includes(searchTerm.toLowerCase()) && !n.message.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleMarkAsRead = (id: number) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const handleDelete = (id: number) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const handleDeleteAll = () => {
    if (window.confirm('Are you sure you want to delete all notifications?')) {
      setNotifications([]);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Notifications</h2>
          <p className="mt-1 text-sm text-slate-600">Loading your notifications...</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin text-blue-600" size={32} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Notifications</h2>
          <p className="mt-1 text-sm text-slate-600">View your notifications</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-red-900">Error Loading Notifications</h4>
            <p className="text-sm text-red-800 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PrototypeNotice />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Notifications</h2>
          {unreadCount > 0 && (
            <p className="mt-1 text-sm text-blue-600 font-medium">
              You have {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
          >
            <CheckCheck size={18} />
            Mark All as Read
          </button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-600" />
            <span className="text-sm font-medium text-slate-700">Type:</span>
          </div>
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              filterType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {['announcement', 'assignment', 'grade', 'attendance', 'event', 'system'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                filterType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
          <label className="flex items-center gap-2 ml-auto">
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(e) => setShowUnreadOnly(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">Unread only</span>
          </label>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg">
            <Bell size={40} className="mx-auto text-slate-400 mb-3" />
            <p className="text-slate-600 font-medium">
              {searchTerm ? 'No notifications match your search' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          Array.isArray(filteredNotifications) ? filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`border rounded-lg p-4 transition ${
                !notification.read
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-white border-slate-200 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="text-2xl flex-shrink-0 mt-1">{getTypeIcon(notification.type)}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-1">
                    <h4
                      className={`font-bold text-lg truncate ${
                        !notification.read ? 'text-slate-900' : 'text-slate-800'
                      }`}
                    >
                      {notification.title}
                    </h4>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full border flex-shrink-0 ${getTypeColor(
                        notification.type,
                      )}`}
                    >
                      {notification.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 mb-2">{notification.message}</p>
                  <p className="text-xs text-slate-500 font-medium">{formatTime(notification.timestamp)}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!notification.read && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="p-2 hover:bg-slate-200 rounded transition"
                      title="Mark as read"
                    >
                      <Check size={18} className="text-blue-600" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="p-2 hover:bg-red-100 rounded transition"
                    title="Delete"
                  >
                    <X size={18} className="text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          )) : null
        )}
      </div>

      {/* Delete All Button */}
      {notifications.length > 0 && (
        <div className="text-center pt-4 border-t border-slate-200">
          <button
            onClick={handleDeleteAll}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Delete all notifications
          </button>
        </div>
      )}

      {/* Notification Settings */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h3 className="font-bold text-slate-900 mb-3">Notification Preferences</h3>
        <div className="space-y-2">
          {['Announcements', 'Assignments', 'Grades', 'Attendance', 'Events'].map((pref) => (
            <label key={pref} className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-300" />
              <span className="text-sm text-slate-700">{pref}</span>
            </label>
          ))}
        </div>
        <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          Save Preferences
        </button>
      </div>
    </div>
  );
};
