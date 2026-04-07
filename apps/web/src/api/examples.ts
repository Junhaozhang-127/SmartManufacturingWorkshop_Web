import { http } from './client';

export interface ExampleMember {
  id: string;
  displayName: string;
  username: string;
  positionCode: string;
  memberStatus: string;
  orgUnitName: string;
  mentorName: string;
  joinDate: string;
  roles: string[];
  skillTags: string[];
}

export interface ExampleListResult {
  items: ExampleMember[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export async function fetchExampleMembers(page = 1, pageSize = 10, keyword = '') {
  return http.get<never, { data: ExampleListResult }>('/examples/members', {
    params: { page, pageSize, keyword: keyword || undefined },
  });
}
