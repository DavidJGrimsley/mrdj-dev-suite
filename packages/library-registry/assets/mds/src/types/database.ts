import type { DatabaseSchema } from '../db/adapter';

export type DemoGuestbookRow = {
  id: string;
  display_name: string;
  message: string;
  created_at: string;
  user_id?: string | null;
};

export type DemoProfileRow = {
  id: string;
  email?: string | null;
  display_name?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type AppDatabase = {
  mds_guestbook: DemoGuestbookRow;
  profiles: DemoProfileRow;
} & DatabaseSchema;

