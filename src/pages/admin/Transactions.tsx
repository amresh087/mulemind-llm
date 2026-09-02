import { useEffect, useState } from 'react';
import { Card, Table, Button, Badge, Spinner, Modal, Form } from 'react-bootstrap';
import { documentService, type DocumentRecord } from '../../services/documentService';

type TransactionHistoryRow = {
  documentId: string;
  name: string;
  tenant: string;
  transactionTypeCode: string;
  status: string;
  updatedAt: string;
};

const Transactions = () => {
  const [transactions, setTransactions] = useState<TransactionHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    void loadTransactionHistory();
  }, []);

  const loadTransactionHistory = async () => {
    setLoading(true);
    setError('');

    try {
      const documents = await documentService.getAll('edi-to-xml');
      const visibleDocuments = documents.filter((document) => {
        const mappingType = document.mappingType?.toLowerCase() ?? '';
        const name = document.name?.toLowerCase() ?? '';
        return !mappingType.includes('mapping') && !mappingType.includes('idoc') && !name.includes('mapping') && !name.includes('xslt') && !name.includes('templet');
      });
      const results = await Promise.all(
        visibleDocuments.map(async (document) => {
          const jobStatus = document.id ? await documentService.getTransformationJobStatus(document.id) : null;
          return {
            documentId: document.id,
            name: document.name,
            tenant: document.tenant,
            transactionTypeCode: document.transactionTypeCode || document.type || 'N/A',
            status: jobStatus?.status || document.status || 'Indexed',
            updatedAt: jobStatus?.updatedAt || '',
          };
        })
      );

      setTransactions(results);
      setCurrentPage(1);
    } catch (err) {
      console.error('Unable to load transaction history', err);
      setError('Unable to load transaction history at this time.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (documentId: string) => {
    if (!documentId) return;

    setDeletingId(documentId);
    setError('');

    try {
      await documentService.remove(documentId);
      await loadTransactionHistory();
    } catch (err) {
      console.error('Unable to delete transaction', err);
      setError('Unable to delete this transaction right now.');
    } finally {
      setDeletingId(null);
    }
  };

  const openArtifactModal = async (documentId: string, xmlType: 'edixml' | 'idocxml') => {
    if (!documentId) return;

    setModalLoading(true);
    setModalOpen(true);
    setModalTitle(xmlType === 'edixml' ? 'EDI XML' : 'IDOC XML');
    setModalContent('');

    try {
      const content = await documentService.getTransactionXml(documentId, xmlType);
      setModalContent(content || 'No artifact available yet.');
    } catch (err) {
      console.error('Unable to load artifact', err);
      setModalContent('Unable to load artifact right now.');
    } finally {
      setModalLoading(false);
    }
  };

  const formatXmlContent = (value: string) => {
    const trimmed = value?.trim() || '';
    if (!trimmed) return '';

    try {
      const parser = new DOMParser();
      const document = parser.parseFromString(trimmed, 'application/xml');
      const parserError = document.querySelector('parsererror');
      if (parserError) {
        throw new Error('Invalid XML payload');
      }

      const escapeXml = (value: string) =>
        value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');

      const formatNode = (node: Node, level: number): string => {
        const indent = '  '.repeat(level);
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent?.trim();
          return text ? `${indent}${escapeXml(text)}` : '';
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
          return '';
        }

        const element = node as Element;
        const attributes = Array.from(element.attributes)
          .map((attribute) => `${attribute.name}="${escapeXml(attribute.value)}"`)
          .join(' ');
        const openingTag = `<${element.tagName}${attributes ? ` ${attributes}` : ''}>`;
        const closingTag = `</${element.tagName}>`;
        const childNodes = Array.from(element.childNodes).filter((child) => {
          if (child.nodeType === Node.TEXT_NODE) return !!child.textContent?.trim();
          return child.nodeType === Node.ELEMENT_NODE;
        });

        const childElements = childNodes.filter((child): child is Element => child.nodeType === Node.ELEMENT_NODE);
        const textChildren = childNodes.filter((child) => child.nodeType === Node.TEXT_NODE);
        const hasOnlyTextChild = childElements.length === 0 && textChildren.length === 1;

        if (!childNodes.length) {
          return `${indent}${openingTag}${closingTag}`;
        }

        if (hasOnlyTextChild) {
          const textValue = textChildren[0].textContent?.trim() ?? '';
          return `${indent}${openingTag}${escapeXml(textValue)}${closingTag}`;
        }

        const innerContent = childNodes.map((child) => formatNode(child, level + 1)).filter(Boolean).join('\n');
        return `${indent}${openingTag}\n${innerContent}\n${indent}${closingTag}`;
      };

      const root = document.documentElement;
      return root ? formatNode(root, 0) : trimmed;
    } catch {
      return trimmed;
    }
  };

  const handleDownloadArtifact = () => {
    if (!modalContent) return;

    const blob = new Blob([modalContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${modalTitle.toLowerCase().replace(/\s+/g, '-')}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized.includes('success') || normalized.includes('complete') || normalized.includes('done')) {
      return 'success';
    }
    if (normalized.includes('fail') || normalized.includes('error')) {
      return 'danger';
    }
    if (normalized.includes('processing') || normalized.includes('pending') || normalized.includes('queued')) {
      return 'warning';
    }
    return 'secondary';
  };

  const formatUpdatedAt = (updatedAt: string) => {
    if (!updatedAt) return '—';
    const date = new Date(updatedAt);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  const filteredTransactions = transactions.filter((tx) => {
    const statusMatches = statusFilter === 'all' || tx.status.toLowerCase() === statusFilter.toLowerCase();
    const tenantMatches = tenantFilter === 'all' || tx.tenant.toLowerCase() === tenantFilter.toLowerCase();
    return statusMatches && tenantMatches;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, tenantFilter, pageSize]);

  const tenantOptions = Array.from(new Set(transactions.map((tx) => tx.tenant).filter(Boolean))).sort();

  const resetFilters = () => {
    setStatusFilter('all');
    setTenantFilter('all');
    setPageSize(10);
    setCurrentPage(1);
  };

  return (
    <div>
      <div className="transactions-header-banner mb-4">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <span className="transactions-icon-badge" aria-label="Transactions">💳</span>
          <div className="transactions-header-text">Transactions</div>
        </div>
      </div>

      <style>{`
        .transactions-header-banner {
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

        .transactions-icon-badge {
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

        .transactions-header-text {
          color: #f8fafc;
          font-size: clamp(1.8rem, 2vw, 2.7rem);
          font-weight: 800;
          letter-spacing: -0.06em;
        }
      `}</style>

      <Card className="border-0 shadow-sm">
        <Card.Body>
          {error && <div className="alert alert-danger py-2">{error}</div>}

          <div className="d-flex flex-wrap align-items-end gap-3 mb-3 rounded-4 border bg-light-subtle p-3" style={{ borderColor: '#e5e7eb' }}>
            <div style={{ minWidth: 170 }}>
              <label className="small text-muted d-block mb-1">Status filter</label>
              <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} size="sm">
                <option value="all">All statuses</option>
                <option value="uploaded">Uploaded</option>
                <option value="processing">Processing</option>
                <option value="pending">Pending</option>
                <option value="success">Success</option>
                <option value="complete">Complete</option>
                <option value="failed">Failed</option>
              </Form.Select>
            </div>

            <div style={{ minWidth: 170 }}>
              <label className="small text-muted d-block mb-1">Tenant</label>
              <Form.Select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)} size="sm">
                <option value="all">All tenants</option>
                {tenantOptions.map((tenant) => (
                  <option key={tenant} value={tenant}>{tenant}</option>
                ))}
              </Form.Select>
            </div>

            <div style={{ minWidth: 130 }}>
              <label className="small text-muted d-block mb-1">Page size</label>
              <Form.Select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} size="sm">
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </Form.Select>
            </div>

            <Button variant="outline-secondary" size="sm" onClick={resetFilters}>
              Clear filters
            </Button>
          </div>

          <Table hover responsive className="align-middle mb-0">
            <thead>
              <tr>
                <th className="small text-uppercase text-muted fw-semibold">Document ID</th>
                <th className="small text-uppercase text-muted fw-semibold">Name</th>
                <th className="small text-uppercase text-muted fw-semibold">Tenant</th>
                <th className="small text-uppercase text-muted fw-semibold">Type</th>
                <th className="small text-uppercase text-muted fw-semibold">Status</th>
                <th className="small text-uppercase text-muted fw-semibold">Updated</th>
                <th className="small text-uppercase text-muted fw-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((tx) => (
                  <tr key={tx.documentId}>
                    <td className="fw-medium">{tx.documentId}</td>
                    <td>{tx.name}</td>
                    <td>{tx.tenant}</td>
                    <td>{tx.transactionTypeCode}</td>
                    <td>
                      <Badge bg={getStatusColor(tx.status)}>{tx.status}</Badge>
                    </td>
                    <td>{formatUpdatedAt(tx.updatedAt)}</td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => void openArtifactModal(tx.documentId?.trim() || '', 'edixml')}
                      >
                        History
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => void handleDeleteTransaction(tx.documentId?.trim() || '')}
                        disabled={deletingId === tx.documentId}
                      >
                        {deletingId === tx.documentId ? <Spinner animation="border" size="sm" /> : '🗑 Delete'}
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    {loading ? 'Loading transaction history…' : 'No transaction history available for the selected filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

          {filteredTransactions.length > 0 && (
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mt-3">
              <span className="text-muted small">
                Showing {filteredTransactions.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + pageSize, filteredTransactions.length)} of {filteredTransactions.length} transactions
              </span>
              <div className="d-flex gap-2 align-items-center">
                <Button variant="outline-secondary" size="sm" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safePage === 1}>
                  ← Previous
                </Button>
                <span className="align-self-center text-muted small">Page {safePage} of {totalPages}</span>
                <Button variant="outline-secondary" size="sm" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safePage === totalPages}>
                  Next →
                </Button>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal show={modalOpen} onHide={() => setModalOpen(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{modalTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalLoading ? (
            <div className="d-flex align-items-center gap-2 text-muted">
              <Spinner animation="border" size="sm" /> Loading artifact...
            </div>
          ) : (
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', maxHeight: '60vh', overflow: 'auto' }}>{formatXmlContent(modalContent)}</pre>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-primary" onClick={handleDownloadArtifact} disabled={!modalContent || modalLoading}>
            ⬇ Download
          </Button>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Transactions;