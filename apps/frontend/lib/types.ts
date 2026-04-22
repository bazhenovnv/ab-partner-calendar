export type Category = {
  id: string;
  title: string;
  slug: string;
  color: string;
  _count?: { events: number };
};

export type EventItem = {
  id: string;
  title: string;
  slug: string;
  descriptionShort: string;
  descriptionFull: string;
  startAt: string;
  endAt: string;
  location: string;
  format: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  imageUrl?: string;
  source?: string;
  sourceUrl?: string;
  isImportant: boolean;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED';
  runtimeStatus?: 'SCHEDULED' | 'LIVE' | 'COMPLETED';
  published: boolean;
  tags: string[];
  category: Category;
  _count?: { reminders: number };
};

export type TelegramImport = {
  id: string;
  sourcePostId: string;
  sourceUrl: string;
  rawText: string;
  parsedTitle?: string | null;
  parsedStartAt?: string | null;
  parsedLocation?: string | null;
  parsedDescription?: string | null;
  status: 'NEW' | 'CONFIRMED' | 'REJECTED' | 'REVIEW';
  createdAt: string;
  updatedAt: string;
};

export type ReminderItem = {
  id: string;
  telegramUserId: string;
  telegramUsername?: string | null;
  remindBefore: '5m' | '15m' | '30m' | '1h' | '1d';
  isActive: boolean;
  createdAt: string;
  event: Pick<EventItem, 'id' | 'title' | 'startAt' | 'location'>;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SUPERADMIN';
  createdAt: string;
};

export type DashboardStats = {
  events: number;
  imports: number;
  reminders: number;
  users: number;
  visitsTotal: number;
  visits7d: number;
  visitsToday: number;
  uniqueVisitors: number;
};

export type AuthResponse = {
  accessToken: string;
  user: AdminUser;
};

export type TopicCollection = {
  slug: string;
  title: string;
  count: number;
  events: Pick<EventItem, 'id' | 'title' | 'slug' | 'startAt' | 'location' | 'format' | 'isImportant'>[];
};

export type AnalyticsSummary = {
  byCity: { city: string; count: number }[];
  byTopic: { topic: string; count: number }[];
  totals: { upcoming: number; live: number; completed: number; highlighted: number };
  attendance: {
    visitsTotal: number;
    visits7d: number;
    visits30d: number;
    uniqueVisitors: number;
    topPaths: { path: string; count: number }[];
    byVisitCity: { city: string; count: number }[];
  };
};
