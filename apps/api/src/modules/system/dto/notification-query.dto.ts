export class NotificationQueryDto {
  page?: number;
  pageSize?: number;
  readStatus?: 'READ' | 'UNREAD';
}
