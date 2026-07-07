import { Notification, shell } from 'electron';
import { Mention } from '../../shared/types';
import { config } from '../store/config';

const notifiedStories = new Set<string>();

export function notifyNewMention(mention: Mention): void {
  const notifConfig = config.get('notifications');
  if (!notifConfig?.enabled || !notifConfig?.newMention) return;
  if (notifiedStories.has(mention.storyGid)) return;

  const notification = new Notification({
    title: `${mention.author} t'a mentionné`,
    body: `${mention.taskName}\n${mention.text.slice(0, 120)}`,
    silent: false,
  });

  notification.on('click', () => {
    if (mention.url) shell.openExternal(mention.url);
  });

  notification.show();
  notifiedStories.add(mention.storyGid);
}

export function checkNewMentions(oldMentions: Mention[], newMentions: Mention[]): void {
  // Don't fire a wall of notifications on the very first load.
  if (oldMentions.length === 0) {
    newMentions.forEach((m) => notifiedStories.add(m.storyGid));
    return;
  }
  const oldIds = new Set(oldMentions.map((m) => m.storyGid));
  for (const mention of newMentions) {
    if (!oldIds.has(mention.storyGid)) {
      notifyNewMention(mention);
    }
  }
}

export function cleanNotificationCache(): void {
  if (notifiedStories.size > 1000) {
    const entries = Array.from(notifiedStories);
    entries.slice(0, entries.length - 500).forEach((id) => notifiedStories.delete(id));
  }
}
