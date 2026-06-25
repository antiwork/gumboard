export async function sendSlackMessage(
  webhookUrl: string,
  message: SlackMessage
): Promise<string | null> {
  try {
    assertSafeWebhookUrl(webhookUrl); // moved inside try

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error(`Failed to send Slack message: ${response.status} ${response.statusText}`);
      return null;
    }

    return Date.now().toString();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error sending Slack message: ${errorMessage}`);
    return null;
  }
}

export async function updateSlackMessage(
  webhookUrl: string,
  originalText: string,
  completed: boolean,
  boardName: string,
  userName: string
): Promise<void> {
  try {
    assertSafeWebhookUrl(webhookUrl); // moved inside try

    const updatedText = completed
      ? `:white_check_mark: ${originalText} by ${userName} in ${boardName}`
      : `:heavy_plus_sign: ${originalText} by ${userName} in ${boardName}`;

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: updatedText,
        username: "Gumboard",
        icon_emoji: ":clipboard:",
      }),
    });

    if (!response.ok) {
      console.error(`Failed to update Slack message: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error updating Slack message: ${errorMessage}`);
  }
}