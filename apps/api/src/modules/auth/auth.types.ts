import type { CurrentUserProfile, DataScopeContext } from '@smw/shared';
import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  requestId?: string;
  currentUser?: CurrentUserProfile;
  dataScopeContext?: DataScopeContext;
  accessToken?: string;
}
