import type { DatabaseSchema } from '../db/adapter';

export type DemoGuestbookRow = {
  id: number;
  user_id: string;
  display_name: string;
  message: string;
  created_at: string;
};

export type AppDatabase = {
  mds_demo_guestbook_comments: DemoGuestbookRow;
} & DatabaseSchema;
