export interface SlackEvent {
  user: string;
  type: 'message' | 'app_mention';
  ts: string;
  text: string;
  team: string;
  channel: string;
  event_ts: string;
  

  client_msg_id?: string;
//   blocks?: any[];
  channel_type?: string;

  subtype?: string;
  bot_id?: string;
}

export interface CommandData {
  task: string | null;
  newTask: string | null;
  id: string | null;
  position: number | null;
  filters: string | null;
}

export interface Organization {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  slackWebhookUrl: string | null;
  slackTeamId: string | null;
  slackBotToken: string | null;
  slackSigningSecret: string | null;
}

// User type
export interface User {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  organizationId: string | null;
  isAdmin: boolean;
  slackUserId: string | null;
  organization: Organization | null;
}