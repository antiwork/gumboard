export type Organization = {
  id: string;
  name: string;
  slackWebhookUrl?: string | null;
  members: User[];
};

export type User = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  isAdmin?: boolean;
  organization: Organization | null;
};
