import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { SlackSetup } from '@/components/slack/setup';
import { redirect } from 'next/navigation';

export default async function SlackSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { 
      organization: {
        select: {
          id: true,
          name: true,
          slackEnabled: true,
          slackTeamId: true,
        }
      }
    }
  });

  if (!user?.organization) {
    redirect('/settings?error=no_organization');
    return null;
  }

  // Fix the type mismatch by ensuring proper type conversion
  const organizationProps = {
    id: user.organization.id,
    name: user.organization.name,
    slackEnabled: user.organization.slackEnabled || false,
    slackTeamId: user.organization.slackTeamId || null, // Keep as null, not undefined
  };

  return (
    <div className="container max-w-2xl py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Slack Integration</h1>
          <p className="text-muted-foreground">
            Connect Gumboard to your Slack workspace for seamless task management.
          </p>
        </div>
        
        <SlackSetup organization={organizationProps} />
      </div>
    </div>
  );
}
