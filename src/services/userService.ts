import api from './api';

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  role: string;
  tenant: string;
  status: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  tenantId?: number;
  roleId?: number;
  active?: boolean;
}

export type UserDto = {
  id?: number;
  username: string;
  email: string;
  password?: string;
  role?: string;
  active?: boolean;
  tenantId?: number;
  tenant?: string;
  status?: string;
};

interface UserPayload {
  id?: number;
  userId?: number;
  firstName?: string | null;
  username?: string;
  name?: string;
  email?: string;
  roleName?: string;
  role?: string;
  tenantName?: string;
  tenant?: string;
  status?: string;
  active?: boolean;
  lastName?: string | null;
  password?: string;
  tenantId?: number;
  roleId?: number;
}

const normalizeUser = (user: UserPayload): UserRecord => ({
  id: user.id ?? user.userId ?? 0,
  name: user.firstName || user.username || user.name || '',
  email: user.email ?? '',
  role: user.roleName ?? user.role ?? 'USER',
  tenant: user.tenantName ?? user.tenant ?? 'Unknown',
  status: user.status ?? (user.active === false ? 'Inactive' : 'Active'),
  username: user.username,
  firstName: user.firstName ?? undefined,
  lastName: user.lastName ?? undefined,
  password: user.password,
  tenantId: user.tenantId,
  roleId: user.roleId,
  active: user.active,
});

const USERS_ENDPOINT = '/tenants/users';

export const getUsers = async () => api.get(USERS_ENDPOINT);
export const createUser = async (payload: UserDto) => api.post(USERS_ENDPOINT, payload);
export const updateUser = async (userId: number, payload: UserDto) => api.put(`${USERS_ENDPOINT}/${userId}`, payload);
export const deleteUser = async (userId: number) => api.delete(`${USERS_ENDPOINT}/${userId}`);

export const userService = {
  getAll: async (): Promise<UserRecord[]> => {
    const response = await api.get(USERS_ENDPOINT);
    const data = Array.isArray(response.data) ? response.data : [];
    return data.map(normalizeUser);
  },

  create: async (payload: {
    username: string;
    email: string;
    password: string;
    tenantId?: number;
    tenantCode?: string;
    roleId?: number;
    status?: string;
    enabled?: boolean;
    accountNonLocked?: boolean;
    credentialsNonExpired?: boolean;
    accountNonExpired?: boolean;
  }): Promise<UserRecord> => {
    const response = await api.post(USERS_ENDPOINT, payload);
    return normalizeUser(response.data);
  },

  update: async (
    userId: number,
    payload: {
      username: string;
      email: string;
      password: string;
      tenantId?: number;
      tenantCode?: string;
      roleId?: number;
      status?: string;
      enabled?: boolean;
      accountNonLocked?: boolean;
      credentialsNonExpired?: boolean;
      accountNonExpired?: boolean;
    }
  ): Promise<UserRecord> => {
    const response = await api.put(`${USERS_ENDPOINT}/${userId}`, payload);
    return normalizeUser(response.data);
  },

  remove: async (userId: number): Promise<void> => {
    await api.delete(`${USERS_ENDPOINT}/${userId}`);
  },
};
