import { useEffect, useState } from 'react';
import { Card, Table, Button, Badge, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { documentService, type DocumentRecord } from '../../services/documentService';
import { tenantService, type TenantRecord } from '../../services/tenantService';

const DocumentList = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [tenantOptions, setTenantOptions] = useState<TenantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentRecord | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'PDF',
    tenant: '',
    version: 'v1',
    status: 'Indexed',
    contentType: '',
    isMuleZip: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    void loadDocuments();
    void loadTenantOptions();
  }, []);

  const loadTenantOptions = async () => {
    try {
      const data = await tenantService.getAll();
      setTenantOptions(data);
      if (!formData.tenant && data.length) {
        setFormData((current) => ({ ...current, tenant: data[0].name }));
      }
    } catch (err) {
      console.error('Unable to load tenant options:', err);
    }
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await documentService.getAll();
      setDocuments(data);
    } catch (err) {
      setError('Unable to load documents from the API.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Indexed':
        return 'success';
      case 'Processing':
        return 'warning';
      case 'Failed':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const resetForm = () => {
    setFormData({ name: '', type: 'PDF', tenant: tenantOptions[0]?.name ?? '', version: 'v1', status: 'Indexed', contentType: '', isMuleZip: false });
    setSelectedFile(null);
    setEditingDoc(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (doc: DocumentRecord) => {
    setEditingDoc(doc);
    setFormData({
      name: doc.name,
      type: doc.type,
      tenant: doc.tenant,
      version: doc.version,
      status: doc.status,
      contentType: doc.contentType ?? '',
      isMuleZip: doc.type === 'MULE_ZIP',
    });
    setShowModal(true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    const isMuleZip = extension === 'zip' && file.type === 'application/zip';
    let inferredType = 'PDF';
    let contentType = 'application/pdf';

    if (isMuleZip) {
      inferredType = 'MULE_ZIP';
      contentType = 'application/zip';
    } else if (extension === 'xml') {
      inferredType = 'XML';
      contentType = 'application/xml';
    } else if (extension === 'txt') {
      inferredType = 'TXT';
      contentType = 'text/plain';
    }

    setFormData((current) => ({
      ...current,
      name: file.name,
      type: inferredType,
      contentType,
      isMuleZip,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (editingDoc) {
        const updated = await documentService.update(editingDoc.id, formData);
        setDocuments((current) => current.map((item) => (item.id === editingDoc.id ? updated : item)));
      } else {
        if (!selectedFile) {
          setError('Please select a file before uploading.');
          return;
        }
        const created = await documentService.upload(formData, selectedFile);
        setDocuments((current) => [created, ...current]);
      }
      setShowModal(false);
      resetForm();
      setError('');
    } catch (err) {
      setError(editingDoc ? 'Unable to update the document.' : 'Unable to upload the document.');
      console.error(err);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await documentService.remove(docId);
      setDocuments((current) => current.filter((doc) => doc.id !== docId));
      setError('');
    } catch (err) {
      setError('Unable to delete the document.');
      console.error(err);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>� Mule ZIP Uploads</h2>
          <p className="text-muted">Upload and manage Mule ZIP transformation packages</p>
        </div>
        <Button variant="primary" onClick={openCreateModal}>📤 Upload Mule ZIP</Button>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {loading ? (
            <div className="d-flex align-items-center gap-2 text-muted">
              <Spinner animation="border" size="sm" />
              <span>Loading documents...</span>
            </div>
          ) : (
            <Table hover>
              <thead>
                <tr>
                  <th>Docs Name</th>
                  <th>Type</th>
                  <th>Tenant</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="fw-medium">{doc.name}</td>
                    <td>
                      {doc.type === 'MULE_ZIP' ? (
                        <Badge bg="info">🔗 Mule ZIP</Badge>
                      ) : (
                        doc.type
                      )}
                    </td>
                    <td>{doc.tenant}</td>                   
                    <td>
                      <Badge bg={getStatusColor(doc.status)}>{doc.status}</Badge>
                    </td>
                    <td>
                      <Button variant="outline-primary" size="sm" className="me-2" onClick={() => openEditModal(doc)}>Edit</Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(doc.id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => { setShowModal(false); resetForm(); }} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingDoc ? '✏️ Edit Mule ZIP' : '📤 Upload Mule ZIP'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Document File</Form.Label>
              <Form.Control type="file" accept=".pdf,.xml,.txt,.zip" onChange={handleFileSelect} />
              <Form.Text className="text-muted">Choose a PDF, XML, TXT, or Mule ZIP file from your computer.</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Document Name</Form.Label>
              <Form.Control value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Type</Form.Label>
              <Form.Select value={formData.type} onChange={(event) => setFormData((current) => ({ ...current, type: event.target.value }))}>
                <option value="PDF">PDF</option>
                <option value="XML">XML</option>
                <option value="TXT">TXT</option>
                <option value="MULE_ZIP">Mule ZIP</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Tenant</Form.Label>
              <Form.Select
                value={formData.tenant}
                onChange={(event) => setFormData((current) => ({ ...current, tenant: event.target.value }))}
                required
              >
                <option value="">Select tenant</option>
                {tenantOptions.map((tenant) => (
                  <option key={tenant.id} value={tenant.name}>
                    {tenant.code} - {tenant.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Version</Form.Label>
              <Form.Control value={formData.version} onChange={(event) => setFormData((current) => ({ ...current, version: event.target.value }))} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select value={formData.status} onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value }))}>
                <option value="Indexed">Indexed</option>
                <option value="Processing">Processing</option>
                <option value="Failed">Failed</option>
              </Form.Select>
            </Form.Group>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
              <Button variant="primary" type="submit">Save</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default DocumentList;
