import React, { useState, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Filter, Search, AlertCircle, Trash2, SlidersHorizontal } from 'lucide-react';
import {
  fetchStudentNotifications,
  markNotificationAsRead,
  deleteNotification,
  markAllNotificationsAsRead,
  deleteAllNotifications,
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
  Alert,
  AlertTitle,
  AlertDescription,
  Skeleton,
} from '@/components/ui';


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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const token = getStoredAuthToken();

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!token) {
        setError('Authentication required. Please log in.');
        return;

      }

      const response = await fetchStudentNotifications(token);

      if (response.success && Array.isArray(response.data)) {
        const notificationsData = response.data.map((n: any, idx: number) => ({
          id: n.id || idx + 1,
          title: n.title || 'Notification',
          message: n.message || '',
          type: n.type || 'system',
          read: Boolean(n.read),
          timestamp: n.timestamp || n.created_at || new Date().toISOString(),
          icon: n.icon,
          actionUrl: n.action_url,
        }));
        setNotifications(notificationsData);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'announcement':
        return 'info';
      case 'assignment':
        return 'warning';
      case 'grade':
        return 'success';
      case 'attendance':
        return 'secondary';
      case 'event':
        return 'default';
      default:
        return 'outline';
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
      if (
        searchTerm &&
        !n.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !n.message.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false;
      return true;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleMarkAsRead = async (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (token) {
      try {
        await markNotificationAsRead(token, id);
      } catch (err) {
        console.warn('Backend markAsRead error:', err);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (token) {
      try {
        await markAllNotificationsAsRead(token);
        setSuccessMessage('All notifications marked as read.');
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        console.warn('Backend markAllAsRead error:', err);
      }
    }
  };

  const handleDelete = async (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (token) {
      try {
        await deleteNotification(token, id);
      } catch (err) {
        console.warn('Backend deleteNotification error:', err);
      }
    }
  };

  const handleDeleteAll = async () => {
    if (window.confirm('Are you sure you want to delete all notifications?')) {
      setNotifications([]);
      if (token) {
        try {
          await deleteAllNotifications(token);
          setSuccessMessage('All notifications cleared.');
          setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
          console.warn('Backend deleteAllNotifications error:', err);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Notifications</h2>
          <p className="mt-1 text-xs text-slate-500 font-medium">Fetching active alerts and university updates...</p>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Header */}
      {error && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle size={18} />
          <AlertTitle>Notification System Alert</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" className="rounded-2xl">
          <Check size={18} />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription className="text-xs">{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Notification Center</h2>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="font-bold text-xs">
                {unreadCount} Unread
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Stay informed on exam timetables, assignment reviews, attendance flags, and campus drives
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            size="sm"
            onClick={handleMarkAllAsRead}
            className="gap-2 rounded-xl text-xs font-semibold self-start sm:self-auto"
          >
            <CheckCheck size={16} />
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Search and Filters Card */}
      <Card className="rounded-2xl border-slate-200/90 shadow-xs">
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search notifications by title or message..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
                <Filter size={13} /> Type:
              </span>
              {['all', 'announcement', 'assignment', 'grade', 'attendance', 'event', 'system'].map((type) => (
                <Button
                  key={type}
                  size="sm"
                  variant={filterType === type ? 'default' : 'ghost'}
                  onClick={() => setFilterType(type)}
                  className={`h-7 px-2.5 text-xs font-semibold rounded-lg capitalize ${
                    filterType === type ? 'bg-blue-600 text-white' : 'text-slate-600'
                  }`}
                >
                  {type}
                </Button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Unread Only</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card className="rounded-2xl border-slate-200 p-12 text-center text-slate-500">
            <Bell size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-800">
              {searchTerm ? 'No notifications match your search' : 'No notifications found'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              You're all caught up! New alerts and campus updates will appear here automatically.
            </p>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`rounded-2xl transition-all hover:shadow-md border ${
                !notification.read
                  ? 'border-blue-200 bg-blue-50/40'
                  : 'border-slate-200/90 bg-white'
              }`}
            >
              <CardContent className="p-4 sm:p-5 flex items-start gap-4">
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-base font-bold ${
                    !notification.read ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Bell size={18} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 truncate">
                        {notification.title}
                      </h4>
                      <Badge
                        variant={getTypeBadgeVariant(notification.type) as any}
                        className="text-[10px] font-bold uppercase shrink-0"
                      >
                        {notification.type}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {formatTime(notification.timestamp)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    {notification.message}
                  </p>

                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="h-7 text-xs font-semibold rounded-lg text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Check size={13} className="mr-1" /> Mark as Read
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(notification.id)}
                      className="h-7 text-xs font-semibold rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={13} className="mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete All Option */}
      {notifications.length > 0 && (
        <div className="text-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteAll}
            className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
          >
            Clear All Notifications
          </Button>
        </div>
      )}
    </div>
  );
};

export default StudentNotifications;
