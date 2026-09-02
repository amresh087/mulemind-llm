import { Card, Table, Button, Alert, Spinner, Modal, Form } from 'react-bootstrap';
import { useEffect, useState } from 'react';
import OnboardClientModal from '../../components/OnboardClientModal';
import { tenantService, type TenantRecord } from '../../services/tenantService';
import { userService } from '../../services/userService';
import { documentService, type DocumentRecord } from '../../services/documentService';

const TenantList = () => {
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showOnboard, setShowOnboard] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantRecord | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<TenantRecord | null>(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    void loadTenants();
  }, []);

  const normalizeTenantKey = (value?: string) => value?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? '';

  const matchesTenant = (tenant: TenantRecord, doc: DocumentRecord) => {
    const docKey = normalizeTenantKey(doc.tenant);
    const codeKey = normalizeTenantKey(tenant.code);
    const nameKey = normalizeTenantKey(tenant.name);

    return (
      docKey === codeKey ||
      docKey === nameKey ||
      nameKey.includes(docKey) ||
      docKey.includes(nameKey)
    );
  };

  const loadTenants = async () => {
    try {
      setLoading(true);
      setError('');
      const [tenantData, userData, documentData] = await Promise.all([
        tenantService.getAll(),
        userService.getAll(),
        documentService.getAll(),
      ]);

      const tenantsWithCounts = tenantData.map((tenant) => {
        const normalized = tenant;
        const count = documentData.filter((doc) => matchesTenant(normalized, doc)).length;
        return {
          ...normalized,
          users: userData.filter((user) => user.tenantId === normalized.id).length,
          documents: count,
        };
      });

      setTenants(tenantsWithCounts);
    } catch (err) {
      setError('Unable to load tenants from the API. Make sure the tenant service is running on localhost:5051.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (tenant: { code: string; name: string; roleCode?: string; status?: string }) => {
    try {
      const created = await tenantService.create({ tenantCode: tenant.code, tenantName: tenant.name });
      setTenants((current) => [{ ...created, status: tenant.status ?? 'Active' }, ...current]);
      setError('');
      console.log('Selected role code:', tenant.roleCode);
    } catch (err) {
      setError('Unable to create the tenant. Please verify the backend payload and service status.');
      console.error(err);
    }
  };

  const handleDeleteTenant = async (tenantId: number) => {
    if (!window.confirm('Delete this tenant?')) return;

    try {
      await tenantService.remove(tenantId);
      setTenants((current) => current.filter((tenant) => tenant.id !== tenantId));
      setError('');
    } catch (err) {
      setError('Unable to delete the tenant.');
      console.error(err);
    }
  };

  const handleEditTenant = (tenant: TenantRecord) => {
    setEditingTenant(tenant);
    setShowOnboard(true);
  };

  const handleUpdateTenant = async (tenant: { id: number; code: string; name: string; roleCode?: string; status?: string }) => {
    try {
      const updated = await tenantService.update(tenant.id, { tenantCode: tenant.code, tenantName: tenant.name });
      setTenants((current) => current.map((item) => (item.id === tenant.id ? {
        ...item,
        code: updated.code,
        name: updated.name,
        status: tenant.status ?? item.status ?? 'Active',
      } : item)));
      setError('');
      setEditingTenant(null);
    } catch (err) {
      setError('Unable to update the tenant.');
      console.error(err);
    }
  };

  const filteredTenants = tenants.filter((tenant) => {
    const matchesFilter = filter === 'all' || tenant.status?.toLowerCase() === filter;
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = !query || [tenant.code, tenant.name, tenant.status]
      .join(' ')
      .toLowerCase()
      .includes(query);

    return matchesFilter && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedTenants = filteredTenants.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [filter, searchTerm, pageSize]);

  return (
    <div>
      <div className="tenant-header-banner mb-4">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <span className="tenant-icon-badge" aria-label="Tenant management">🏢</span>
          <div className="tenant-header-text">Tenant Management</div>
        </div>
        <div className="tenant-header-actions">
          <Button
            variant="light"
            size="sm"
            className="tenant-create-btn"
            onClick={() => {
              setEditingTenant(null);
              setShowOnboard(true);
            }}
          >
            + Create Tenant
          </Button>
        </div>
      </div>

      <style>{`
        .tenant-header-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.1rem 1.4rem;
          border-radius: 1.4rem;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.96) 55%, rgba(79, 70, 229, 0.92) 100%);
          box-shadow: 0 16px 30px rgba(15, 23, 42, 0.12);
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .tenant-icon-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 0.9rem;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #f8fafc;
          font-size: 1.2rem;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
        }

        .tenant-header-text {
          color: #f8fafc;
          font-size: clamp(1.8rem, 2vw, 2.7rem);
          font-weight: 800;
          letter-spacing: -0.06em;
        }

        .tenant-header-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .tenant-create-btn {
          border-radius: 999px !important;
          font-weight: 700;
          padding: 0.55rem 1rem;
          background: rgba(255, 255, 255, 0.12) !important;
          border: 1px solid rgba(255, 255, 255, 0.18) !important;
          color: #ffffff !important;
        }

        @media (max-width: 767px) {
          .tenant-header-banner {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      <Card className="border-0 shadow-sm">
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          {!loading && (
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <div className="d-flex gap-2 flex-wrap align-items-center">
                <Form.Control
                  size="sm"
                  type="text"
                  placeholder="Search tenants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '220px' }}
                />
                <Form.Select
                  size="sm"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  style={{ width: '180px' }}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Form.Select>
              </div>
              <div className="d-flex align-items-center gap-2">
                <small className="text-muted">Rows</small>
                <Form.Select
                  size="sm"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  style={{ width: '82px' }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                </Form.Select>
              </div>
              <small className="text-muted">
                Showing {filteredTenants.length} tenants
              </small>
            </div>
          )}

          {loading ? (
            <div className="d-flex align-items-center gap-2 text-muted">
              <Spinner animation="border" size="sm" />
              <span>Loading tenants...</span>
            </div>
          ) : (
            <>
              <Table hover size="sm">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Users</th>
                    <th>Documents</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTenants.map((tenant) => (
                    <tr key={tenant.id}>
                      <td className="fw-medium">{tenant.code}</td>
                      <td>{tenant.name}</td>
                      <td>
                        <span className={`badge bg-${tenant.status === 'Active' ? 'success' : 'secondary'}`}>
                          {tenant.status}
                        </span>
                      </td>
                      <td>{tenant.users}</td>
                      <td>{tenant.documents}</td>
                      <td>
                        <Button variant="outline-secondary" size="sm" className="me-2" onClick={() => handleEditTenant(tenant)}>Edit</Button>
                        <Button variant="outline-danger" size="sm" onClick={() => handleDeleteTenant(tenant.id)}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {filteredTenants.length > pageSize && (
                <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                  <small className="text-muted">
                    Page {currentPage} of {totalPages}
                  </small>
                  <div className="d-flex gap-2">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      <OnboardClientModal
        show={showOnboard}
        onClose={() => {
          setShowOnboard(false);
          setEditingTenant(null);
        }}
        onCreate={handleCreateTenant}
        onUpdate={handleUpdateTenant}
        editingTenant={editingTenant}
      />

      <Modal show={!!selectedTenant} onHide={() => setSelectedTenant(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Tenant Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTenant && (
            <div>
              <p><strong>Code:</strong> {selectedTenant.code}</p>
              <p><strong>Name:</strong> {selectedTenant.name}</p>
              <p><strong>Status:</strong> {selectedTenant.status}</p>
              <p><strong>Users:</strong> {selectedTenant.users}</p>
              <p><strong>Documents:</strong> {selectedTenant.documents}</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSelectedTenant(null)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TenantList;
