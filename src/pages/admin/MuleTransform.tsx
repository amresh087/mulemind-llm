import { Card, Button, Row, Col, Form, Alert, Spinner, Modal } from 'react-bootstrap';
import { useEffect, useState } from 'react';
import { documentService } from '../../services/documentService';
import { tenantService, type TenantRecord } from '../../services/tenantService';

type SubmissionState = {
  status: 'idle' | 'submitted';
  transformationId: string;
  documentStatus: string;
  message: string;
  createdAt: string;
  updatedAt: string;
};

type WorkflowTimelineStatus = 'active' | 'completed' | 'pending' | 'failed';

type WorkflowStep = {
  title: string;
  caption: string;
  startedAt?: Date;
  duration: string;
  status: WorkflowTimelineStatus;
};

const MuleTransform = () => {
  const [selectedTenant, setSelectedTenant] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [error, setError] = useState('');
  const [tenantOptions, setTenantOptions] = useState<TenantRecord[]>([]);

  const [submissionState, setSubmissionState] = useState<SubmissionState>({
    status: 'idle',
    transformationId: '',
    documentStatus: '',
    message: '',
    createdAt: '',
    updatedAt: '',
  });

  // Helper: recognize canonical server statuses and treat metadata payloads separately
  const isRecognizedServerStatus = (status?: string) => {
    if (!status) return false;
    const normalized = status.trim().toUpperCase();
    const canonical = /^(CREATED|UPLOADED|SCANNING|SCAN_COMPLETED|METADATA_PROCESSING|METADATA_COMPLETED|AI_ANALYZING|AI_ANALYSIS_COMPLETED|DOCUMENT_GENRATING|DOCUMENT_COMPLETED|COMPLETED|FAILED|SUBMITTED|EDI_TEXT_TO_EDI_XML|EDI_XML_TO_IDOC_XML|PROCESSING|PENDING|CANCELLED)$/;
    if (canonical.test(normalized)) return true;
    if (status.includes('=') || status.includes(';')) return false; // metadata
    return /^[A-Z_]+$/.test(normalized);
  };

  useEffect(() => {
    void loadOptions();
  }, []);

  useEffect(() => {
    if (submissionState.status !== 'submitted') {
      return;
    }

    const normalized = (submissionState.documentStatus || '').trim().toLowerCase();
    const shouldAutoPoll = /created|uploaded|scanning|scan_completed|metadata_processing|metadata_completed|ai_analyzing|ai_analysis_completed|document_genrating|document_generating|pending|processing|running|queued|submitted/i.test(normalized);
    if (!shouldAutoPoll) {
      return;
    }

    const fastPoll = /scanning|ai_analyzing|document_genrating|document_generating|processing|running/.test(normalized);
    const intervalMs = fastPoll ? 2000 : 5000;

    const timer = window.setInterval(() => {
      void refreshSubmissionStatus(false);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [submissionState.status, submissionState.documentStatus, submissionState.transformationId]);

  const loadOptions = async () => {
    try {
      // API: Load all available tenants from the tenant service to populate the dropdown on component mount
      const tenantData = await tenantService.getAll();
      setTenantOptions(tenantData);
      if (!selectedTenant && tenantData.length) {
        setSelectedTenant(tenantData[0].name);
      }
    } catch (err) {
      console.error('Unable to load tenant options', err);
      setError('Unable to load tenant options.');
    }
  };

  const updateJobStatus = async (status: string, payload?: string) => {
    if (!submissionState.transformationId) {
      return null;
    }

    try {
      // API: Fetch the current job details to get the job ID before updating its status
      const jobStatus = await documentService.getTransformationJobStatus(submissionState.transformationId);
      if (!jobStatus?.id) {
        return null;
      }

      // API: Update the job status with new workflow stage and optional metadata payload
      return documentService.updateTransformationJobStatus(jobStatus.id, status, payload ?? status);
    } catch (err) {
      console.error('Unable to update transformation job status', err);
      return null;
    }
  };

  const refreshSubmissionStatus = async (showLoading = true) => {
    if (!submissionState.transformationId) {
      return;
    }

    if (showLoading) {
      setRefreshingStatus(true);
    }

    try {
      // API: Poll the backend to get the latest workflow status and artifact payload during transformation
      const jobStatus = await documentService.getTransformationJobStatus(submissionState.transformationId);
      const candidateStatus = jobStatus?.status?.trim() || submissionState.documentStatus || 'Created';
      const recognized = isRecognizedServerStatus(candidateStatus);
      const latestStatus = recognized ? candidateStatus : submissionState.documentStatus || 'Created';
      const normalizedStatus = latestStatus.toLowerCase();
      const nextMessage = normalizedStatus.includes('complete') || normalizedStatus.includes('success')
        ? 'The workflow completed successfully.'
        : normalizedStatus.includes('process') || normalizedStatus.includes('running')
          ? 'The workflow is still processing. Click refresh again for the latest update.'
          : 'The workflow status was refreshed from the document API.';

      const statusMessage = recognized ? nextMessage : (jobStatus?.payload ? `Metadata: ${jobStatus.payload}` : nextMessage);
      setSubmissionState((previous) => ({
        ...previous,
        documentStatus: latestStatus,
        message: statusMessage,
        createdAt: jobStatus?.createdAt || previous.createdAt || new Date().toISOString(),
        updatedAt: jobStatus?.updatedAt || new Date().toISOString(),
      }));
      await updateJobStatus(latestStatus, nextMessage);
    } catch (err) {
      console.error('Unable to refresh workflow status', err);
      setError('Unable to refresh the workflow status right now.');
    } finally {
      if (showLoading) {
        setRefreshingStatus(false);
      }
    }
  };

  const getWorkflowStage = (status: string) => {
    const normalized = status.trim().toLowerCase();
    if (normalized.includes('failed')) return 12;
    if (normalized.includes('document_complted') || normalized.includes('document_completed')) return 10;
    if (normalized.includes('document_genrating') || normalized.includes('document_generating')) return 9;
    if (normalized.includes('ai_analysis_completed')) return 8;
    if (normalized.includes('ai_analyzing')) return 7;
    if (normalized.includes('metadata_completed')) return 6;
    if (normalized.includes('metadata_processing')) return 5;
    if (normalized.includes('scan_completed')) return 4;
    if (normalized.includes('scanning')) return 3;
    if (normalized.includes('uploaded')) return 2;
    if (normalized.includes('created')) return 1;
    if (normalized.includes('complete') || normalized.includes('success') || normalized.includes('done')) return 11;
    return 1;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    if (!selectedFile) {
      setFile(null);
      setError('');
      return;
    }

    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (extension !== 'zip') {
      setFile(null);
      setError('Please select a .zip file.');
      event.target.value = '';
      return;
    }

    setFile(selectedFile);
    setError('');
  };

  const handleTransform = async () => {
    if (!selectedTenant || !file) {
      setError('Please select a tenant and EDI file.');
      return;
    }

    setLoading(true);
    setError('');
    setSubmissionState({ status: 'idle', transformationId: '', documentStatus: '', message: '', createdAt: '', updatedAt: '' });

    try {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? 'zip';
      const documentPayload = {
        name: file.name,
        type: 'ZIP',
        tenant: selectedTenant,
        mappingType: 'MULE_TRANSFORM_MICROSERVICE',
        status: 'Created',
        contentType: 'application/zip',
      };

      // API: Upload the selected ZIP file to the document service, which will initiate the transformation workflow
      const uploadedDocument = await documentService.upload(documentPayload, file);

      alert('File uploaded successfully. Transformation workflow has started.');
      const documentId = uploadedDocument.id || uploadedDocument.name || 'pending';
      
      // API: Fetch the initial job status immediately after upload to display current workflow stage
      const jobStatus = await documentService.getTransformationJobStatus(documentId);
      const candidateStatus = jobStatus?.status?.trim() || uploadedDocument.status || 'Created';
      const recognized = isRecognizedServerStatus(candidateStatus);
      const effectiveStatus = recognized ? candidateStatus : (uploadedDocument.status || 'Created');

      const submittedMessage = 'The upload request was accepted and the transformation workflow has started.';
      setSubmissionState({
        status: 'submitted',
        transformationId: documentId,
        documentStatus: effectiveStatus,
        message: recognized ? submittedMessage : (jobStatus?.payload ? `Metadata: ${jobStatus.payload}` : submittedMessage),
        createdAt: jobStatus?.createdAt || new Date().toISOString(),
        updatedAt: jobStatus?.updatedAt || new Date().toISOString(),
      });
      await updateJobStatus(effectiveStatus, submittedMessage);
    } catch (err) {
      console.error(err);
      setError('Unable to upload the file to the document API and transform it.');
    } finally {
      setLoading(false);
    }
  };









  const getWorkflowBadgeVariant = (status: string) => {
    const normalized = status.trim().toLowerCase();
    if (normalized.includes('failed')) {
      return 'danger';
    }
    if (normalized.includes('completed') || normalized.includes('success') || normalized.includes('done')) {
      return 'success';
    }
    if (/created|uploaded|scanning|scan_completed|metadata_processing|metadata_completed|ai_analyzing|ai_analysis_completed|document_genrating|document_generating|processing|running|queue|pending|submitted/i.test(normalized)) {
      return 'warning';
    }
    return 'secondary';
  };

  const getWorkflowStageLabel = (status: string) => {
    const workflowStage = getWorkflowStage(status);
    const stageLabels: { [key: number]: string } = {
      1: 'Stage 1 • Created',
      2: 'Stage 2 • Uploaded',
      3: 'Stage 3 • Scanning',
      4: 'Stage 4 • Scan Completed',
      5: 'Stage 5 • MetaData Processing',
      6: 'Stage 6 • MetaData Completed',
      7: 'Stage 7 • AI Analyzing',
      8: 'Stage 8 • AI Analysis Completed',
      9: 'Stage 9 • Document Generating',
      10: 'Stage 10 • Document Completed',
      11: 'Stage 11 • Completed',
      12: 'Stage 12 • Failed',
    };
    return stageLabels[workflowStage] || 'Stage 1 • Created';
  };

  const parseDate = (value?: string) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatDateTime = (value?: string) => {
    const parsed = parseDate(value);
    if (!parsed) return '—';
    return new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    }).format(parsed);
  };

  const formatDuration = (start?: string, end?: string) => {
    const startDate = parseDate(start);
    const endDate = parseDate(end);
    if (!startDate || !endDate) return '—';

    const diffMs = Math.max(0, endDate.getTime() - startDate.getTime());
    const totalSeconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getWorkflowStepStates = (status: string) => {
    const normalized = status.trim().toLowerCase();
    const isFailed = /failed/.test(normalized);
    const workflowStage = getWorkflowStage(status);

    return {
      step1: workflowStage >= 1 ? (workflowStage === 1 ? 'active' : 'completed') : 'pending',
      step2: workflowStage >= 2 ? (workflowStage === 2 ? 'active' : 'completed') : 'pending',
      step3: workflowStage >= 3 ? (workflowStage === 3 ? 'active' : 'completed') : 'pending',
      step4: workflowStage >= 4 ? (workflowStage === 4 ? 'active' : 'completed') : 'pending',
      step5: workflowStage >= 5 ? (workflowStage === 5 ? 'active' : 'completed') : 'pending',
      step6: workflowStage >= 6 ? (workflowStage === 6 ? 'active' : 'completed') : 'pending',
      step7: workflowStage >= 7 ? (workflowStage === 7 ? 'active' : 'completed') : 'pending',
      step8: workflowStage >= 8 ? (workflowStage === 8 ? 'active' : 'completed') : 'pending',
      step9: workflowStage >= 9 ? (workflowStage === 9 ? 'active' : 'completed') : 'pending',
      step10: workflowStage >= 10 ? (workflowStage === 10 ? 'active' : 'completed') : 'pending',
      step11: workflowStage >= 11 ? (workflowStage === 11 ? 'active' : 'completed') : 'pending',
      step12: isFailed ? 'failed' : workflowStage >= 12 ? 'completed' : 'pending',
    };
  };

  const workflowStage = getWorkflowStage(submissionState.documentStatus || 'submitted');
  const workflowStepStates = getWorkflowStepStates(submissionState.documentStatus || 'submitted');
  const workflowSteps: WorkflowStep[] = (() => {
    const normalizedStatus = (submissionState.documentStatus || '').trim().toLowerCase();
    const isCompleted = /complete|success|done/.test(normalizedStatus);
    const isFailed = /fail|error/.test(normalizedStatus);
    const currentStartedAt = parseDate(submissionState.createdAt) ?? new Date();
    const statusUpdatedAt = parseDate(submissionState.updatedAt) ?? new Date();
    const now = new Date();

    const totalElapsedMs = Math.max(0, now.getTime() - currentStartedAt.getTime());
    const smallStage2Ms = 30 * 1000;
    const stage2Duration = workflowStage >= 3 ? Math.min(smallStage2Ms, totalElapsedMs) : undefined;
    const stage3DurationMs = workflowStage >= 3 ? Math.max(0, totalElapsedMs - (stage2Duration ?? 0)) : undefined;

    const stage2DurationLabel = stage2Duration ? (Math.floor(stage2Duration / 1000) + 's') : (workflowStage === 2 ? formatDuration(currentStartedAt.toISOString(), now.toISOString()) : '—');
    const stage3DurationLabel = stage3DurationMs ? (Math.floor(stage3DurationMs / 1000) + 's') : (workflowStage === 3 ? formatDuration(statusUpdatedAt?.toISOString(), now.toISOString()) : '—');

    return [
      // Stage 1: Created
      {
        title: '1. Created',
        caption: 'ZIP file received',
        startedAt: currentStartedAt,
        duration: workflowStage === 1 ? formatDuration(currentStartedAt.toISOString(), now.toISOString()) : '0s',
        status: workflowStepStates.step1 === 'active' ? 'active' : workflowStepStates.step1 === 'completed' ? 'completed' : 'pending',
      },
      // Stage 2: Uploaded
      {
        title: '2. Uploaded',
        caption: 'File uploaded to the system',
        startedAt: currentStartedAt,
        duration: workflowStage >= 2 ? (workflowStage === 2 ? formatDuration(currentStartedAt.toISOString(), now.toISOString()) : '—') : '—',
        status: workflowStepStates.step2 === 'active' ? 'active' : workflowStepStates.step2 === 'completed' ? 'completed' : 'pending',
      },
      // Stage 3: Scanning
      {
        title: '3. Scanning',
        caption: 'Scanning the ZIP file contents',
        startedAt: workflowStage >= 3 ? statusUpdatedAt : undefined,
        duration: workflowStage >= 3 ? (workflowStage === 3 ? formatDuration(statusUpdatedAt?.toISOString(), now.toISOString()) : '—') : '—',
        status: workflowStepStates.step3 === 'active' ? 'active' : workflowStepStates.step3 === 'completed' ? 'completed' : 'pending',
      },
      // Stage 4: Scan Completed
      {
        title: '4. Scan Completed',
        caption: 'Scanning process finished',
        startedAt: workflowStage >= 4 ? statusUpdatedAt : undefined,
        duration: workflowStage >= 4 ? (workflowStage === 4 ? formatDuration(statusUpdatedAt?.toISOString(), now.toISOString()) : '—') : '—',
        status: workflowStepStates.step4 === 'active' ? 'active' : workflowStepStates.step4 === 'completed' ? 'completed' : 'pending',
      },
      // Stage 5: MetaData Processing
      {
        title: '5. MetaData Processing',
        caption: 'Extracting metadata from the files',
        startedAt: workflowStage >= 5 ? statusUpdatedAt : undefined,
        duration: workflowStage >= 5 ? (workflowStage === 5 ? formatDuration(statusUpdatedAt?.toISOString(), now.toISOString()) : '—') : '—',
        status: workflowStepStates.step5 === 'active' ? 'active' : workflowStepStates.step5 === 'completed' ? 'completed' : 'pending',
      },
      // Stage 6: MetaData Completed
      {
        title: '6. MetaData Completed',
        caption: 'Metadata extraction completed',
        startedAt: workflowStage >= 6 ? statusUpdatedAt : undefined,
        duration: workflowStage >= 6 ? (workflowStage === 6 ? formatDuration(statusUpdatedAt?.toISOString(), now.toISOString()) : '—') : '—',
        status: workflowStepStates.step6 === 'active' ? 'active' : workflowStepStates.step6 === 'completed' ? 'completed' : 'pending',
      },
      // Stage 7: AI Analyzing
      {
        title: '7. AI Analyzing',
        caption: 'Running AI analysis on the code',
        startedAt: workflowStage >= 7 ? statusUpdatedAt : undefined,
        duration: workflowStage >= 7 ? (workflowStage === 7 ? formatDuration(statusUpdatedAt?.toISOString(), now.toISOString()) : '—') : '—',
        status: workflowStepStates.step7 === 'active' ? 'active' : workflowStepStates.step7 === 'completed' ? 'completed' : 'pending',
      },
      // Stage 8: AI Analysis Completed
      {
        title: '8. AI Analysis Completed',
        caption: 'AI analysis finished',
        startedAt: workflowStage >= 8 ? statusUpdatedAt : undefined,
        duration: workflowStage >= 8 ? (workflowStage === 8 ? formatDuration(statusUpdatedAt?.toISOString(), now.toISOString()) : '—') : '—',
        status: workflowStepStates.step8 === 'active' ? 'active' : workflowStepStates.step8 === 'completed' ? 'completed' : 'pending',
      },
      // Stage 9: Document Generating
      {
        title: '9. Document Generating',
        caption: 'Generating documentation from analysis',
        startedAt: workflowStage >= 9 ? statusUpdatedAt : undefined,
        duration: workflowStage >= 9 ? (workflowStage === 9 ? formatDuration(statusUpdatedAt?.toISOString(), now.toISOString()) : '—') : '—',
        status: workflowStepStates.step9 === 'active' ? 'active' : workflowStepStates.step9 === 'completed' ? 'completed' : 'pending',
      },
      // Stage 10: Document Completed
      {
        title: '10. Document Completed',
        caption: 'Documentation generation completed',
        startedAt: workflowStage >= 10 ? statusUpdatedAt : undefined,
        duration: workflowStage >= 10 ? (workflowStage === 10 ? formatDuration(statusUpdatedAt?.toISOString(), now.toISOString()) : '—') : '—',
        status: workflowStepStates.step10 === 'active' ? 'active' : workflowStepStates.step10 === 'completed' ? 'completed' : 'pending',
      },
      // Stage 11: Completed
      {
        title: '11. Completed',
        caption: 'Workflow completed successfully',
        startedAt: workflowStage >= 11 ? statusUpdatedAt : undefined,
        duration: workflowStage >= 11 ? (workflowStage === 11 ? formatDuration(statusUpdatedAt?.toISOString(), now.toISOString()) : '—') : '—',
        status: workflowStepStates.step11 === 'active' ? 'active' : workflowStepStates.step11 === 'completed' ? 'completed' : 'pending',
      },
      // Stage 12: Failed
      {
        title: '12. Failed',
        caption: isFailed ? 'The workflow ended with an error' : 'Waiting for the final result',
        startedAt: workflowStage >= 12 ? statusUpdatedAt : undefined,
        duration: '—',
        status: workflowStepStates.step12 === 'failed' ? 'failed' : workflowStepStates.step12 === 'completed' ? 'completed' : 'pending',
      },
    ];
  })();

  const currentWorkflowStage = getWorkflowStage(submissionState.documentStatus || 'submitted');

  const placeholderWorkflowSteps: WorkflowStep[] = [
    { title: '1. Created', caption: 'ZIP file received', duration: '—', status: 'pending' },
    { title: '2. Uploaded', caption: 'File uploaded to the system', duration: '—', status: 'pending' },
    { title: '3. Scanning', caption: 'Scanning the ZIP file contents', duration: '—', status: 'pending' },
    { title: '4. Scan Completed', caption: 'Scanning process finished', duration: '—', status: 'pending' },
    { title: '5. MetaData Processing', caption: 'Extracting metadata from the files', duration: '—', status: 'pending' },
    { title: '6. MetaData Completed', caption: 'Metadata extraction completed', duration: '—', status: 'pending' },
    { title: '7. AI Analyzing', caption: 'Running AI analysis on the code', duration: '—', status: 'pending' },
    { title: '8. AI Analysis Completed', caption: 'AI analysis finished', duration: '—', status: 'pending' },
    { title: '9. Document Generating', caption: 'Generating documentation from analysis', duration: '—', status: 'pending' },
    { title: '10. Document Completed', caption: 'Documentation generation completed', duration: '—', status: 'pending' },
    { title: '11. Completed', caption: 'Workflow completed successfully', duration: '—', status: 'pending' },
    { title: '12. Failed', caption: 'The final state will be added when the workflow finishes', duration: '—', status: 'pending' },
  ];

  const renderWorkflowTimeline = (steps: WorkflowStep[]) => (
    <div className="d-flex flex-column gap-3">
      {steps.map((step, index) => {
        // Stage number corresponds to index + 1 (Stage 1-12)
        const isActive = step.status === 'active';
        const isCompleted = step.status === 'completed';
        const isFailed = step.status === 'failed';
        const isPending = step.status === 'pending';

        return (
          <div key={`${step.title}-${index}`} className="d-flex align-items-start gap-3">
            <div className="d-flex flex-column align-items-center" style={{ minWidth: 36 }}>
              <div className="rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: 36, height: 36, backgroundColor: isCompleted ? '#198754' : isFailed ? '#dc3545' : isActive ? '#0d6efd' : '#e9ecef', color: isCompleted || isFailed || isActive ? '#fff' : '#6c757d', fontSize: '0.95rem' }}>
                {index + 1}
              </div>
              {index < steps.length - 1 && (
                <div className="mt-2" style={{ width: 2, height: 28, backgroundColor: isCompleted ? '#198754' : isFailed ? '#dc3545' : isActive ? '#0d6efd' : '#e9ecef' }} />
              )}
            </div>
            <div className="flex-grow-1 py-1">
              <div>
                <div className="fw-semibold d-flex align-items-center">
                  {isActive && <Spinner animation="border" size="sm" className="me-2" />}
                  <span>{step.title}</span>
                </div>
                <div className="text-muted small">{step.caption}</div>
                <div className="mt-2 small text-muted">
                  <div>Duration: {step.duration}</div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="py-3">
      <div className="border rounded-4 p-4 mb-4 bg-light-subtle" style={{ borderColor: '#e5e7eb' }}>
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start gap-3">
          <div>
            <h2 className="mb-2">🔄 Mule Transformation</h2>
            <p className="text-muted mb-0">Upload a ZIP file containing EDI content, submit it for transformation, and monitor the workflow status from the document API.</p>
          </div>
          <div className="d-flex flex-wrap gap-2 align-items-center">
                    <span className="text-muted small">Ready to transform</span>
                  </div>
        </div>
      </div>

      <Row className="g-4">
        <Col lg={5}>
          <Card className="border-0 shadow-sm h-100 rounded-4">
            <Card.Body className="p-4">
              {error && <Alert variant="danger">{error}</Alert>}

              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="mb-1">Upload & transform</h5>
                  <p className="text-muted small mb-0">Complete the steps below to submit an EDI file.</p>
                </div>
              </div>

              <div className="d-flex flex-column gap-3">
                <div className="p-3 rounded-3 border bg-light-subtle">
                  <div className="mb-2">
                    <div className="fw-semibold">Step 1 • Select options</div>
                  </div>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Tenant</Form.Label>
                    <Form.Select value={selectedTenant} onChange={(e) => setSelectedTenant(e.target.value)}>
                      <option value="">Choose Tenant</option>
                      {tenantOptions.map((tenant) => (
                        <option key={tenant.id} value={tenant.name}>{tenant.code} - {tenant.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </div>

                <div className="p-3 rounded-3 border bg-light-subtle">
                  <div className="fw-semibold mb-2">Step 2 • Upload file</div>
                  <Form.Control type="file" accept=".zip" onChange={handleFileChange} />
                  <div className="text-muted mt-2 small">{file?.name || 'No file selected yet'}</div>
                </div>

                <div className="p-3 rounded-3 border bg-light-subtle">
                  <div className="fw-semibold mb-2">Step 3 • Transform</div>
                  <Button variant="primary" onClick={handleTransform} disabled={!selectedTenant || !file || loading} className="w-100 py-2">
                    {loading ? (<><Spinner animation="border" size="sm" /> <span className="ms-2">Transforming…</span></>) : '🚀 Transform EDI'}
                  </Button>
                </div>
              </div>

            </Card.Body>
          </Card>
        </Col>

        <Col lg={7}>
          <div className="d-flex flex-column gap-3">
            <Card className="border-0 shadow-sm rounded-4">
              <Card.Header className="bg-white border-bottom d-flex justify-content-between align-items-center px-4 py-3">
                <div>
                  <Card.Title className="mb-0">Submission Status</Card.Title>
                  <Card.Text className="text-muted mb-0">Results returned by the document API</Card.Text>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Button variant="outline-secondary" size="sm" onClick={() => void refreshSubmissionStatus()} disabled={refreshingStatus || submissionState.status !== 'submitted'}>
                    {refreshingStatus ? <><Spinner animation="border" size="sm" className="me-2" />Refreshing</> : '🔄 Refresh'}
                  </Button>
                </div>
              </Card.Header>
              <Card.Body className="p-4">
                {submissionState.status === 'submitted' ? (
                  <div className="d-flex flex-column gap-3">
                    <div className="p-3 rounded-4 border bg-light-subtle">
                      <div className="mb-3">
                        <div className="fw-semibold">Results returned by the document API</div>
                        <div className="text-muted small">Live workflow execution details</div>
                      </div>

                      <div className="d-flex flex-column flex-md-row gap-3 mb-3">
                        <div className="flex-grow-1 p-3 rounded-3 border bg-white">
                          <div className="text-uppercase small text-muted mb-1">Transformation ID</div>
                          <div className="fw-semibold text-monospace">{submissionState.transformationId}</div>
                        </div>
                        <div className="flex-grow-1 p-3 rounded-3 border bg-white">
                          <div className="text-uppercase small text-muted mb-1">Last updated</div>
                          <div className="fw-semibold">{submissionState.updatedAt || 'Just now'}</div>
                        </div>
                      </div>

                      <div className="rounded-3 border bg-white p-3">
                        <div className="mb-3">
                          <h6 className="mb-1">Workflow status</h6>
                          <div className="text-muted small">{submissionState.message}</div>
                        </div>

                        {renderWorkflowTimeline(workflowSteps)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-4 border border-dashed p-4 text-center text-muted bg-light-subtle">
                    <div className="fw-semibold mb-2">No active workflow yet</div>
                    <div className="mb-3">Use the panel on the left to submit an EDI file and watch the workflow appear here.</div>
                    <div className="rounded-3 border bg-white p-3 text-start">
                      <div className="mb-3">
                        <h6 className="mb-1">Workflow preview</h6>
                      </div>
                      {renderWorkflowTimeline(placeholderWorkflowSteps)}
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>


          </div>
        </Col>
      </Row>

    </div>
  );
};

export default MuleTransform;