import { useEffect, useMemo, useState } from 'react';
import { Row, Col, Card, Badge, ProgressBar, Button, Spinner, Alert } from 'react-bootstrap';
import { tenantService, type TenantRecord } from '../../services/tenantService';
import { userService, type UserRecord } from '../../services/userService';
import { documentService, type DocumentRecord } from '../../services/documentService';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError('');

        const [tenantData, userData, documentData] = await Promise.all([
          tenantService.getAll(),
          userService.getAll(),
          documentService.getAll(),
        ]);

        setTenants(tenantData);
        setUsers(userData);
        setDocuments(documentData);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Unable to load dashboard data from the API. Please check the backend services.');
      } finally {
        setLoading(false);
      }
    };

    void loadDashboardData();
  }, []);

  const activeTenantCount = tenants.filter((tenant) =>
    tenant.status?.toLowerCase() !== 'inactive' && tenant.status?.toLowerCase() !== 'disabled'
  ).length || tenants.length;

  const activeUserCount = users.filter((user) =>
    user.status?.toLowerCase() !== 'inactive' && user.status?.toLowerCase() !== 'disabled' && user.active !== false
  ).length || users.length;

  const totalDocuments = documents.length;
  const processedDocuments = documents.filter((document) =>
    ['completed', 'processed', 'indexed', 'success', 'active'].includes((document.status || '').toLowerCase())
  ).length;
  const successRate = totalDocuments > 0 ? Math.round((processedDocuments / totalDocuments) * 100) : 0;
  const pendingApprovals = users.filter((user) => (user.status || '').toLowerCase() === 'pending').length;
  const tenantHealth = tenants.length ? Math.round((activeTenantCount / tenants.length) * 100) : 0;
  const userHealth = users.length ? Math.round((activeUserCount / users.length) * 100) : 0;
  const systemHealth = Math.round((tenantHealth + userHealth + successRate) / 3);

  const stats = useMemo(() => [
    { label: 'Active Tenants', value: activeTenantCount.toString(), delta: `${tenants.length ? 'Live' : '0'}`, icon: '🏢', accent: 'primary' },
    { label: 'Active Users', value: activeUserCount.toString(), delta: `${users.length ? 'Synced' : '0'}`, icon: '👥', accent: 'success' },
    { label: 'Documents', value: totalDocuments.toLocaleString(), delta: `${successRate}% success`, icon: '📄', accent: 'warning' },
    { label: 'Transactions', value: totalDocuments.toLocaleString(), delta: `${processedDocuments} processed`, icon: '🔄', accent: 'danger' },
  ], [activeTenantCount, activeUserCount, tenants.length, users.length, totalDocuments, processedDocuments, successRate]);

  const activity = useMemo(() => {
    const realTenantActivity = tenants.slice(0, 3).map((tenant) => ({
      title: 'Tenant',
      detail: `${tenant.name || tenant.code || 'Unnamed tenant'} · ${tenant.status || 'Active'}`,
      time: tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : 'Live',
      tone: 'success',
    }));

    const realUserActivity = users.slice(0, 3).map((user) => ({
      title: 'User',
      detail: `${user.name || user.username || user.email || 'Unknown user'} · ${user.status || 'Active'}`,
      time: 'Live',
      tone: 'primary',
    }));

    const realDocumentActivity = documents.slice(0, 2).map((doc) => ({
      title: 'Document',
      detail: `${doc.name || 'Document'} · ${doc.status || 'Indexed'}`,
      time: 'Live',
      tone: 'warning',
    }));

    return [...realTenantActivity, ...realUserActivity, ...realDocumentActivity].slice(0, 4);
  }, [tenants, users, documents]);

  const overviewMetrics = useMemo(() => [
    { label: 'Successful jobs', value: `${successRate}%`, tone: 'success' },
    { label: 'Total documents', value: totalDocuments.toLocaleString(), tone: 'primary' },
    { label: 'Pending approvals', value: pendingApprovals.toString(), tone: 'warning' },
  ], [successRate, totalDocuments, pendingApprovals]);

  if (loading) {
    return (
      <div className="dashboard-shell d-flex align-items-center justify-content-center min-vh-50">
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <div className="text-muted">Loading dashboard data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-shell">
        <Alert variant="danger">{error}</Alert>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      <div className="dashboard-topbar">
        <div className="dashboard-header-group">
          <span className="dashboard-icon-badge" aria-label="Platform dashboard">📊</span>
          <h2 className="dashboard-title">Platform dashboard</h2>
        </div>
      </div>

      <Row className="g-3 mb-4">
        {stats.map((stat) => (
          <Col key={stat.label} xs={12} sm={6} xl={3}>
            <Card className="metric-card border-0 h-100">
              <Card.Body className="d-flex align-items-center justify-content-between gap-3">
                <div>
                  <div className="metric-label">{stat.label}</div>
                  <div className="metric-value">{stat.value}</div>
                  <div className={`metric-delta text-${stat.accent}`}>
                    {stat.delta}
                  </div>
                </div>
                <div className={`metric-icon bg-${stat.accent} bg-opacity-10 text-${stat.accent}`}>
                  {stat.icon}
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="g-4 mb-4">
        <Col lg={8}>
          <Card className="panel-card border-0 shadow-sm h-100">
            <Card.Header className="panel-header border-0 bg-transparent d-flex justify-content-between align-items-center">
              <div>
                <span className="panel-kicker">Performance</span>
                <h3 className="panel-title mb-0">Operational health</h3>
              </div>
              <Badge bg="success-subtle" text="success" className="rounded-pill px-2 py-2">Healthy</Badge>
            </Card.Header>
            <Card.Body>
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="stat-mini-label">System health</span>
                  <strong>{systemHealth}%</strong>
                </div>
                <ProgressBar now={systemHealth} variant="success" className="progress-bar-soft" />
              </div>
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="stat-mini-label">Document processing</span>
                  <strong>{successRate}%</strong>
                </div>
                <ProgressBar now={successRate} variant="primary" className="progress-bar-soft" />
              </div>
              <div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="stat-mini-label">Tenant coverage</span>
                  <strong>{tenantHealth}%</strong>
                </div>
                <ProgressBar now={tenantHealth} variant="warning" className="progress-bar-soft" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="panel-card border-0 shadow-sm h-100">
            <Card.Header className="panel-header border-0 bg-transparent">
              <span className="panel-kicker">Overview</span>
              <h3 className="panel-title mb-0">Operational snapshot</h3>
            </Card.Header>
            <Card.Body className="d-flex flex-column gap-3">
              {overviewMetrics.map((item) => (
                <div key={item.label} className={`mini-stat-box bg-${item.tone}-subtle text-${item.tone}`}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={7}>
          <Card className="panel-card border-0 shadow-sm h-100">
            <Card.Header className="panel-header border-0 bg-transparent d-flex justify-content-between align-items-center">
              <div>
                <span className="panel-kicker">Activity</span>
                <h3 className="panel-title mb-0">Recent events</h3>
              </div>
              <Button variant="link" className="p-0 text-primary text-decoration-none">View all</Button>
            </Card.Header>
            <Card.Body className="activity-panel-body">
              {activity.slice(0, 4).map((item) => (
                <div key={`${item.title}-${item.detail}`} className="activity-item">
                  <div className={`activity-dot bg-${item.tone}`} />
                  <div className="activity-content">
                    <div className="activity-title">{item.title}</div>
                    <div className="activity-detail">{item.detail}</div>
                  </div>
                  <small className="activity-time">{item.time}</small>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="panel-card border-0 shadow-sm h-100">
            <Card.Header className="panel-header border-0 bg-transparent">
              <span className="panel-kicker">Summary</span>
              <h3 className="panel-title mb-0">Platform pulse</h3>
            </Card.Header>
            <Card.Body className="d-flex flex-column gap-3">
              <div className="mini-stat-box bg-primary-subtle text-primary">
                <span>Documents</span>
                <strong>{totalDocuments.toLocaleString()}</strong>
              </div>
              <div className="mini-stat-box bg-success-subtle text-success">
                <span>Success rate</span>
                <strong>{successRate}%</strong>
              </div>
              <div className="mini-stat-box bg-warning-subtle text-warning">
                <span>Pending approvals</span>
                <strong>{pendingApprovals}</strong>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboard;