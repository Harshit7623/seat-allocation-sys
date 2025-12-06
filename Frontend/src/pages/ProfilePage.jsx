import React, { useState } from 'react';
import { User, LogOut, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ProfilePage = ({ showToast }) => {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });

  const recentActions = [
    { action: 'Uploaded student data', date: '2025-10-28', status: 'success' },
    { action: 'Generated seat allocation', date: '2025-10-27', status: 'success' },
    { action: 'Downloaded PDF report', date: '2025-10-26', status: 'success' }
  ];

  const handleSave = () => {
    showToast('Profile updated successfully!', 'success');
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully', 'success');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white">
            <div className="flex items-center gap-6">
              <div className="bg-white/20 p-4 rounded-full">
                <User size={48} />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{user?.name}</h1>
                <p className="text-blue-100">{user?.email}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-sm">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled={!isEditing}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.role}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Recent Actions */}
            <div className="mt-12">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {recentActions.map((action, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="text-green-500" size={20} />
                      <div>
                        <p className="font-medium text-gray-900">{action.action}</p>
                        <p className="text-sm text-gray-500">{action.date}</p>
                      </div>
                    </div>
                    <span className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full">
                      {action.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Logout Button */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                <LogOut size={20} />
                Logout from Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;