import { useEffect, useState } from 'react';
import { Card, Table, Button, Badge, Spinner, Modal, Form } from 'react-bootstrap';
import { documentService, formatReportFileName, type ReportDocument } from '../../services/documentService';

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
  const [reportLoadingId, setReportLoadingId] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [reportDocumentId, setReportDocumentId] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [pageSize, setPageSize] = useState(5);
  const [sortAscending, setSortAscending] = useState(false);

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

  const handleOpenReportList = async (documentId: string) => {
    if (!documentId) return;

    setReportLoadingId(documentId);
    setError('');

    try {
      const reportList = await documentService.listReports(documentId);
      setReports(reportList);
      setReportDocumentId(documentId);
      setModalTitle('Available reports');
      setModalOpen(true);
    } catch (err) {
      console.error('Unable to load transaction reports', err);
      setError('Unable to load reports for this transaction right now.');
    } finally {
      setReportLoadingId(null);
    }
  };

  const openReport = async (documentId: string, reportType: string, download: boolean) => {
    try {
      const report = await documentService.getReport(documentId, reportType);
      const reportUrl = URL.createObjectURL(report);
      if (download) {
        const link = document.createElement('a');
        link.href = reportUrl;
        link.download = `${documentId}-${reportType}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        setModalOpen(false);
        setPreviewTitle(`${reportType} report`);
        setPreviewUrl((currentUrl) => {
          if (currentUrl) URL.revokeObjectURL(currentUrl);
          return reportUrl;
        });
      }
      if (download) {
        window.setTimeout(() => URL.revokeObjectURL(reportUrl), 60_000);
      }
    } catch (err) {
      console.error('Unable to open transaction report', err);
      setError(`Unable to ${download ? 'download' : 'preview'} this report right now.`);
    }
  };

  const closePreview = () => {
    setPreviewUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return null;
    });
    setModalOpen(true);
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

  const filteredTransactions = transactions
    .filter((tx) => {
      const statusMatches = statusFilter === 'all' || tx.status.toLowerCase() === statusFilter.toLowerCase();
      const tenantMatches = tenantFilter === 'all' || tx.tenant.toLowerCase() === tenantFilter.toLowerCase();
      return statusMatches && tenantMatches;
    })
    .sort((left, right) => {
      const leftTime = Date.parse(left.updatedAt);
      const rightTime = Date.parse(right.updatedAt);
      const leftSortableTime = Number.isNaN(leftTime) ? Number.NEGATIVE_INFINITY : leftTime;
      const rightSortableTime = Number.isNaN(rightTime) ? Number.NEGATIVE_INFINITY : rightTime;

      const dateOrder = sortAscending ? leftSortableTime - rightSortableTime : rightSortableTime - leftSortableTime;
      const idOrder = sortAscending
        ? left.documentId.localeCompare(right.documentId)
        : right.documentId.localeCompare(left.documentId);
      return dateOrder || idOrder;
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
    setSortAscending(false);
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

        .transactions-filters {
          border-color: #e5e7eb !important;
        }

        .transactions-filter-field {
          min-width: 170px;
        }

        .transactions-page-size-field {
          min-width: 130px;
        }

        .transactions-pagination-bar {
          display: block !important;
          width: 100%;
          min-height: 8.5rem;
          position: relative;
          z-index: 2;
          background: #fff;
          border-top: 1px solid #e5e7eb;
          padding-top: 1rem;
        }

        .transactions-pagination {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          margin-bottom: 0;
        }

        .transactions-pagination .page-link {
          min-width: 2.25rem;
          text-align: center;
          font-weight: 600;
        }

        .transactions-table-wrapper {
          overflow-x: auto;
          overflow-y: visible;
        }

        .transactions-table-wrapper table {
          min-width: 960px;
        }

        .transactions-table-body tr {
          height: 3.5rem;
        }

        .transactions-artifact-preview {
          white-space: pre-wrap;
          font-size: 0.85rem;
          max-height: 60vh;
          overflow: auto;
        }

        @media (max-width: 575.98px) {
          .transactions-pagination {
            justify-content: flex-start;
            overflow-x: auto;
            flex-wrap: nowrap;
            padding-bottom: 0.25rem;
          }
        }
      `}</style>

      <Card className="border-0 shadow-sm">
        <Card.Body>
          {error && <div className="alert alert-danger py-2">{error}</div>}

          <div className="transactions-filters d-flex flex-wrap align-items-end gap-3 mb-3 rounded-4 border bg-light-subtle p-3">
            <div className="transactions-filter-field">
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

            <div className="transactions-filter-field">
              <label className="small text-muted d-block mb-1">Tenant</label>
              <Form.Select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)} size="sm">
                <option value="all">All tenants</option>
                {tenantOptions.map((tenant) => (
                  <option key={tenant} value={tenant}>{tenant}</option>
                ))}
              </Form.Select>
            </div>

            <div className="transactions-page-size-field">
              <label className="small text-muted d-block mb-1">Page size</label>
              <Form.Select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} size="sm">
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </Form.Select>
            </div>

            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => {
                setSortAscending((ascending) => !ascending);
                setCurrentPage(1);
              }}
              aria-label={`Sort by updated date, ${sortAscending ? 'newest first' : 'oldest first'}`}
              title="Toggle updated date sorting"
            >
              {sortAscending ? 'Oldest first' : 'Newest first'}
            </Button>

            <Button variant="outline-secondary" size="sm" onClick={resetFilters}>
              Clear filters
            </Button>
          </div>

          <div className="table-responsive transactions-table-wrapper">
            <Table hover className="align-middle mb-0">
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
              <tbody className="transactions-table-body">
                {paginatedTransactions.length > 0 ? (
                  paginatedTransactions.map((tx, index) => (
                    <tr key={`${tx.documentId}-${startIndex + index}`}>
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
                          aria-label="View transaction history"
                          title="View transaction history"
                          onClick={() => void handleOpenReportList(tx.documentId?.trim() || '')}
                          disabled={reportLoadingId === tx.documentId}
                        >
                          {reportLoadingId === tx.documentId ? <Spinner animation="border" size="sm" /> : '📄'}
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          aria-label="Delete transaction"
                          title="Delete transaction"
                          onClick={() => void handleDeleteTransaction(tx.documentId?.trim() || '')}
                          disabled={deletingId === tx.documentId}
                        >
                          {deletingId === tx.documentId ? <Spinner animation="border" size="sm" /> : '🗑'}
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
          </div>

        </Card.Body>
        <Card.Footer className="transactions-pagination-bar">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
            <span className="text-muted small">
              {filteredTransactions.length > 0
                ? `Showing ${startIndex + 1}-${Math.min(startIndex + pageSize, filteredTransactions.length)} of ${filteredTransactions.length} transactions`
                : 'Showing 0 transactions'}
            </span>
            {filteredTransactions.length > pageSize && (
              <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                <small className="text-muted">Page {safePage} of {totalPages}</small>
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    disabled={safePage === 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    disabled={safePage === totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card.Footer>
      </Card>

      <Modal show={modalOpen} onHide={() => setModalOpen(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{modalTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ minHeight: '45vh', maxHeight: '65vh', overflowY: 'auto' }}>
          {reports.length > 0 ? (
            <div className="list-group">
              {reports.map((report) => (
                <div key={report.fileName} className="list-group-item d-flex align-items-center justify-content-between gap-3">
                  <span className="fw-semibold text-break">{formatReportFileName(report.fileName)}</span>
                  <div className="d-flex gap-2">
                    <Button variant="outline-primary" size="sm" onClick={() => void openReport(reportDocumentId, report.type, false)}>
                      Preview
                    </Button>
                    <Button variant="outline-secondary" size="sm" onClick={() => void openReport(reportDocumentId, report.type, true)}>
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted">No reports are available for this transaction.</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Close</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(previewUrl)} onHide={closePreview} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>{previewTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0" style={{ height: '80vh' }}>
          {previewUrl && (
            <iframe
              title={previewTitle}
              src={previewUrl}
              style={{ width: '100%', height: '100%', border: 0 }}
            />
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Transactions;