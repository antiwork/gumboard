import { NextRequest, NextResponse } from 'next/server';
import { slackClient } from '@/lib/slack/client';

// Define proper types for Slack interactive payloads
interface SlackAction {
  action_id: string;
  value: string;
  type: string;
}

interface SlackUser {
  id: string;
  name?: string;
}

interface SlackInteractivePayload {
  type: string;
  callback_id?: string;
  actions?: SlackAction[];
  user?: SlackUser;
}

interface SlackVerificationPayload {
  type: string;
  challenge?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    // Handle URL verification challenge
    if (body.includes('challenge')) {
      const payload = JSON.parse(body) as SlackVerificationPayload;
      if (payload.type === 'url_verification') {
        return NextResponse.json({ 
          challenge: payload.challenge 
        });
      }
    }

    // Verify Slack request signature for actual interactions
    if (!slackClient.verifySlackRequest(request, body)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data (Slack sends interactive payloads as form data)
    const formData = new URLSearchParams(body);
    const payloadString = formData.get('payload');
    
    if (!payloadString) {
      return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
    }

    const payload = JSON.parse(payloadString) as SlackInteractivePayload;

    // Handle different types of interactions
    switch (payload.type) {
      case 'block_actions':
        return await handleBlockActions(payload);
      case 'shortcut':
        return await handleShortcut(payload);
      default:
        return NextResponse.json({ ok: true });
    }
  } catch (error) {
    console.error('Interactive component error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleBlockActions(payload: SlackInteractivePayload) {
  // Handle button clicks, menu selections, etc.
  if (payload.actions) {
    for (const action of payload.actions) {
      if (action.action_id === 'complete_task') {
        console.log('Complete task:', action.value);
        return NextResponse.json({ 
          text: `Task ${action.value} marked as complete!`,
          response_type: 'ephemeral'
        });
      }
    }
  }
  
  return NextResponse.json({ ok: true });
}

async function handleShortcut(payload: SlackInteractivePayload) {
  // Handle Slack shortcuts
  if (payload.callback_id === 'create_task') {
    console.log('Create task shortcut triggered for user:', payload.user?.id);
    return NextResponse.json({
      text: 'Opening task creation modal...',
      response_type: 'ephemeral'
    });
  }
  
  return NextResponse.json({ ok: true });
}
