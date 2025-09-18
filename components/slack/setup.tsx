'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// Remove Badge and Alert imports if they don't exist
// import { Badge } from '@/components/ui/badge';
// import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Settings, ExternalLink } from 'lucide-react';

interface SlackSetupProps {
  organization: {
    id: string;
    name: string;
    slackEnabled: boolean;
    slackTeamId: string | null; // Changed from undefined to null
  };
}

export function SlackSetup({ organization }: SlackSetupProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      // Build Slack OAuth URL
      const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID;
      if (!clientId) {
        throw new Error('Slack client ID not configured');
      }

      const slackOAuthUrl = new URL('https://slack.com/oauth/v2/authorize');
      slackOAuthUrl.searchParams.set('client_id', clientId);
      slackOAuthUrl.searchParams.set('scope', 'app_mentions:read,chat:write,channels:read,groups:read,im:read,mpim:read,users:read');
      slackOAuthUrl.searchParams.set('redirect_uri', `${window.location.origin}/api/slack/auth`);
      slackOAuthUrl.searchParams.set('state', organization.id);

      // Redirect to Slack OAuth
      window.location.href = slackOAuthUrl.toString();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Slack');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setError(null);
      
      const response = await fetch('/api/slack/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: organization.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect Slack');
      }

      // Refresh the page to update the UI
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Slack');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Slack Integration</CardTitle>
          </div>
          {organization.slackEnabled && (
            <div className="bg-green-50 text-green-700 border-green-200 px-2 py-1 rounded text-sm">
              <CheckCircle className="h-3 w-3 mr-1 inline" />
              Connected
            </div>
          )}
        </div>
        <CardDescription>
          Connect {organization.name} to Slack for natural language task management.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            {error}
          </div>
        )}

        {organization.slackEnabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Connected to Slack workspace</span>
            </div>
            
            {organization.slackTeamId && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium mb-1">Workspace Details</p>
                <p className="text-sm text-muted-foreground">
                  Team ID: <code className="bg-background px-1 py-0.5 rounded text-xs">{organization.slackTeamId}</code>
                </p>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">How to use:</h4>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• Mention @Gumboard in any channel: <code className="bg-blue-100 px-1 py-0.5 rounded text-xs">@gumboard what&apos;s on my list?</code></li>
                <li>• Send direct messages: <code className="bg-blue-100 px-1 py-0.5 rounded text-xs">Add call John about pricing</code></li>
                <li>• Use natural language: <code className="bg-blue-100 px-1 py-0.5 rounded text-xs">Mark the first task as done</code></li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDisconnect}>
                Disconnect Slack
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.open('https://slack.com/apps/manage', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage App
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Slack not connected</span>
            </div>

            <Button 
              onClick={handleConnect} 
              disabled={isConnecting}
              className="w-full"
              size="lg"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting to Slack...
                </>
              ) : (
                'Connect to Slack'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
