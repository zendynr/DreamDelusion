import { useState, useEffect } from 'react';
import { getCurrentUser, updateUser, deleteUser, signOut } from './auth';
import { User } from './types';

export default function AccountManagement({ onSignOut }: { onSignOut: () => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setName(currentUser.name);
        setEmail(currentUser.email);
      }
    };
    loadUser();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Note: Firebase Auth doesn't allow changing email directly
      // Only updating name/displayName
      const result = await updateUser(name);
      if (result.success && result.user) {
        setUser(result.user);
        setSuccess('Profile updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to update profile');
      }
    } catch (err: any) {
      console.error('Update profile error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setError('');
    setLoading(true);

    try {
      // Note: deleteUserAccount may require password for re-authentication
      const result = await deleteUser();
      if (result.success) {
        onSignOut();
      } else {
        setError(result.error || 'Failed to delete account');
        setShowDeleteConfirm(false);
      }
    } catch (err: any) {
      console.error('Delete account error:', err);
      setError(err.message || 'An unexpected error occurred');
      setShowDeleteConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      onSignOut();
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError('Failed to sign out');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="account-management">
      <div className="account-header">
        <h2>Account Settings</h2>
      </div>

      <div className="account-section">
        <h3>Profile Information</h3>
        <form onSubmit={handleUpdateProfile} className="account-form">
          <div className="form-group">
            <label htmlFor="account-name">Name</label>
            <input
              id="account-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </div>

          <div className="form-group">
            <label htmlFor="account-email">Email</label>
            <input
              id="account-email"
              type="email"
              value={email}
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
              title="Email cannot be changed"
            />
            <small style={{ color: 'var(--text-secondary)', fontSize: '0.85em', marginTop: '4px', display: 'block' }}>
              Email cannot be changed for security reasons
            </small>
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {success && (
            <div className="auth-success">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="account-button"
            disabled={loading || name === user.name}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="account-section">
        <h3>Account Actions</h3>
        <div className="account-actions">
          <button
            className="account-button secondary"
            onClick={handleSignOut}
          >
            Sign Out
          </button>
          <button
            className="account-button danger"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete Account
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Account</h3>
            <p>Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data.</p>
            <div className="modal-actions">
              <button
                className="account-button"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="account-button danger"
                onClick={handleDeleteAccount}
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

