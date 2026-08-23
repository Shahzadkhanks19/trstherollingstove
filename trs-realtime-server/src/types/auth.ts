export interface AccessClaims {
  userId: string;
  sessionId: string;
  tokenVersion: number;
}

export interface SocketUser {
  id: string;
  sessionId: string;
  name: string;
  email: string;
  roleId: string;
  roleKey: string;
  permissions: string[];
}
