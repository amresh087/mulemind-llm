import api from './api';

export interface DocumentRecord {
  id: string;
  name: string;
  type: string;
  tenant: string;
  version: string;
  status: string;
  contentType?: string;
  objectName?: string;
  isMuleZip?: boolean;
}

interface DocumentPayload {
  name: string;
  type?: string;
  tenant?: string;
  version?: string;
  status?: string;
  contentType?: string;
  isMuleZip?: boolean;
}

interface DocumentApiResponse {
  id?: string;
  name?: string;
  type?: string;
  tenant?: string;
  version?: string;
  status?: string;
  contentType?: string;
  objectName?: string;
  isMuleZip?: boolean;
}

const normalizeDocument = (doc: DocumentApiResponse): DocumentRecord => ({
  id: doc.id ?? '',
  name: doc.name ?? '',
  type: doc.type ?? 'PDF',
  tenant: doc.tenant ?? 'Unknown',
  version: doc.version ?? 'v1',
  status: doc.status ?? 'Indexed',
  contentType: doc.contentType,
  isMuleZip: doc.isMuleZip ?? (doc.type === 'MULE_ZIP'),
});

export const documentService = {
  getAll: async (): Promise<DocumentRecord[]> => {
    const response = await api.get('/documents');
    return (response.data ?? []).map(normalizeDocument);
  },

  create: async (payload: DocumentPayload): Promise<DocumentRecord> => {
    const response = await api.post('/documents', payload);
    return normalizeDocument(response.data);
  },

  upload: async (payload: DocumentPayload, file: File): Promise<DocumentRecord> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', payload.name);
    if (payload.type) formData.append('type', payload.type);
    if (payload.tenant) formData.append('tenant', payload.tenant);
    if (payload.version) formData.append('version', payload.version);
    if (payload.status) formData.append('status', payload.status);
    if (payload.contentType) formData.append('contentType', payload.contentType);
    if (payload.isMuleZip) formData.append('isMuleZip', String(payload.isMuleZip));

    const response = await api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return normalizeDocument(response.data);
  },

  update: async (id: string, payload: DocumentPayload): Promise<DocumentRecord> => {
    const response = await api.put(`/documents/${id}`, payload);
    return normalizeDocument(response.data);
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`);
  },
};
