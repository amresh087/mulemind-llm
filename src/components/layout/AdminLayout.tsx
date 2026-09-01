import { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../auth/AuthContext';
import { Button } from 'react-bootstrap';
import './AdminLayout.css';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const menuItems = [
    { label: 'Dashboard', icon: '📊', path: '/admin' },
    { label: 'Tenants', icon: '🏢', path: '/admin/tenants' },
    { label: 'Users', icon: '👥', path: '/admin/users' },
    { label: 'Mule ZIP Uploads', icon: '📄', path: '/admin/documents' },
    { label: 'EDI Transformation', icon: '🔄', path: '/admin/edi-transform' },
    { label: 'Transactions', icon: '💳', path: '/admin/transactions' },
    { label: 'AI Settings', icon: '⚡', path: '/admin/ai-settings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    auth?.logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="admin-topbar">
        <div className="brand-cluster">
          <div className="brand-mark">M</div>
          <div className="brand-text">
            <span className="brand-name">MuleMind</span>
            <small className="brand-subtitle">Operations Suite</small>
          </div>
        </div>

        <nav className="top-nav" aria-label="Main navigation">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`top-nav-link ${isActive(item.path) ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <div className="user-badge">
            <span className="user-avatar">A</span>
            <div className="user-meta d-none d-lg-block">
              <strong>{auth?.user?.username || 'Admin'}</strong>
            </div>
          </div>

          <Button variant="outline-secondary" className="logout-action" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      <main className="app-main-panel">
        <div className="content-surface">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
