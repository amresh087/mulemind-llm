import { Row, Col, Card, Badge, ProgressBar, Button } from 'react-bootstrap';
import './AdminDashboard.css';

const AdminDashboard = () => {

  const stats = [
    { label: 'Total Tenants', value: '12', delta: '+3.4%', icon: '🏢', accent: 'primary' },
    { label: 'Total Users', value: '85', delta: '+12%', icon: '👥', accent: 'success' },
    { label: 'Documents', value: '1,540', delta: '+18%', icon: '📄', accent: 'warning' },
    { label: 'EDI Jobs', value: '5,245', delta: '+8.2%', icon: '🔄', accent: 'danger' },
  ];

  const activity = [
    { title: 'Tenant onboarding', detail: '3 new tenants approved today', time: '2 hrs ago', tone: 'success' },
    { title: 'EDI queue health', detail: '512 jobs processed without errors', time: '45 mins ago', tone: 'primary' },
    { title: 'Storage warning', detail: 'Backup usage is above target by 6%', time: '1 hr ago', tone: 'warning' },
  ];

  const quickActions = ['Create tenant', 'Upload ZIP', 'Run EDI sync', 'Review jobs'];

  return (
    <div className="dashboard-shell">
      <Row className="g-3 mb-4">
        {stats.map((stat) => (
          <Col key={stat.label} xs={12} sm={6} xl={3}>
            <Card className="metric-card border-0 shadow-sm h-100">
              <Card.Body className="d-flex align-items-center justify-content-between gap-3">
                <div>
                  <div className="metric-label">{stat.label}</div>
                  <div className="metric-value">{stat.value}</div>
                  <div className={`metric-delta text-${stat.accent}`}>
                    {stat.delta} vs last month
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
                  <span className="stat-mini-label">API reliability</span>
                  <strong>99.8%</strong>
                </div>
                <ProgressBar now={99.8} variant="success" className="progress-bar-soft" />
              </div>
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="stat-mini-label">Document indexing</span>
                  <strong>92%</strong>
                </div>
                <ProgressBar now={92} variant="primary" className="progress-bar-soft" />
              </div>
              <div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="stat-mini-label">EDI automation</span>
                  <strong>88%</strong>
                </div>
                <ProgressBar now={88} variant="warning" className="progress-bar-soft" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="panel-card border-0 shadow-sm h-100">
            <Card.Header className="panel-header border-0 bg-transparent">
              <span className="panel-kicker">Actions</span>
              <h3 className="panel-title mb-0">Quick actions</h3>
            </Card.Header>
            <Card.Body className="d-grid gap-2">
              {quickActions.map((action) => (
                <Button key={action} variant="light" className="quick-action-btn text-start rounded-3 fw-semibold border-0">
                  {action}
                </Button>
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
            <Card.Body className="p-0">
              {activity.map((item) => (
                <div key={item.title} className="activity-item">
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
                <span>Jobs completed</span>
                <strong>1,248</strong>
              </div>
              <div className="mini-stat-box bg-success-subtle text-success">
                <span>Successful syncs</span>
                <strong>96.2%</strong>
              </div>
              <div className="mini-stat-box bg-warning-subtle text-warning">
                <span>Pending approvals</span>
                <strong>14</strong>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboard;