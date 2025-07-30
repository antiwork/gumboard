interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  elements?: Array<{
    type: string;
    text: string;
  }>;
}

interface SlackMessage {
  text: string;
  blocks?: SlackBlock[];
}

interface SlackNotificationContext {
  boardName: string;
  noteContent: string;
  authorName: string;
  authorEmail: string;
  action: "created" | "completed" | "uncompleted";
}

export async function sendSlackNotification(
  webhookUrl: string,
  context: SlackNotificationContext
): Promise<void> {
  try {
    let message: SlackMessage;

    switch (context.action) {
      case "created":
        message = {
          text: `New task added to ${context.boardName}`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*New task added to ${context.boardName}*`,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: context.noteContent,
              },
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `Added by ${context.authorName || context.authorEmail}`,
                },
              ],
            },
          ],
        };
        break;

      case "completed":
        message = {
          text: `Task completed in ${context.boardName}`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `Task completed in *${context.boardName}*`,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `${context.noteContent
                  .split("\n")
                  .map((line) => `~${line}~`)
                  .join("\n")}`,
              },
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `Completed by ${context.authorName || context.authorEmail}`,
                },
              ],
            },
          ],
        };
        break;

      case "uncompleted":
        message = {
          text: `Task reopened in ${context.boardName}`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Task reopened in ${context.boardName}*`,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: context.noteContent,
              },
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `Reopened by ${context.authorName || context.authorEmail}`,
                },
              ],
            },
          ],
        };
        break;
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error(
        "Failed to send Slack notification:",
        response.status,
        response.statusText
      );
    }
  } catch (error) {
    console.error("Error sending Slack notification:", error);
  }
}
