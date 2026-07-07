import axios, { AxiosInstance } from 'axios';
import { Mention, TodayTask } from '../../shared/types';

export interface AsanaWorkspace {
  gid: string;
  name: string;
}

export interface AsanaMe {
  gid: string;
  name: string;
  workspaces: AsanaWorkspace[];
}

interface RawTask {
  gid: string;
  name: string;
  completed?: boolean;
  permalink_url?: string;
  due_on?: string | null;
  modified_at?: string;
  projects?: { gid: string; name: string }[];
}

interface RawStory {
  gid: string;
  type?: string;
  resource_subtype?: string;
  created_at?: string;
  created_by?: { gid: string; name: string };
  text?: string;
  html_text?: string;
  /** True when the *current* user liked this story. */
  liked?: boolean;
}

/** How many recently-modified tasks we scan for mentions on each poll. */
const MENTION_TASK_SCAN_LIMIT = 40;
/** Parallel story fetches (stay well under Asana rate limits). */
const STORY_CONCURRENCY = 5;

/**
 * Minimal Asana REST client (Personal Access Token).
 * Docs: https://developers.asana.com/reference
 */
export class AsanaClient {
  private client: AxiosInstance;
  /** Set to false after the first 402 so we stop retrying the premium search API. */
  private searchAvailable = true;

  constructor(token: string) {
    this.client = axios.create({
      baseURL: 'https://app.asana.com/api/1.0',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /** Returns the authenticated user + workspaces, or null if the token is invalid. */
  async validate(): Promise<AsanaMe | null> {
    try {
      const res = await this.client.get('/users/me', {
        params: { opt_fields: 'name,workspaces.name' },
      });
      const d = res.data?.data;
      if (!d?.gid) return null;
      return {
        gid: d.gid,
        name: d.name ?? '',
        workspaces: (d.workspaces ?? []).map((w: any) => ({ gid: w.gid, name: w.name })),
      };
    } catch {
      return null;
    }
  }

  /**
   * Comments (stories) mentioning `userGid`, posted in the last `sinceDays` days,
   * on tasks the user follows (being @mentioned auto-adds you as follower).
   */
  async getMentions(workspaceGid: string, userGid: string, sinceDays: number): Promise<Mention[]> {
    const since = new Date(Date.now() - sinceDays * 24 * 3600 * 1000);
    const tasks = await this.getRecentFollowedTasks(workspaceGid, since);

    const mentions: Mention[] = [];
    // Small worker pool: stories of several tasks in parallel.
    let cursor = 0;
    const workers = Array.from({ length: STORY_CONCURRENCY }, async () => {
      while (cursor < tasks.length) {
        const task = tasks[cursor++];
        const stories = await this.getStories(task.gid);
        // A mention is "handled" once I replied on the task afterwards.
        const myLastComment = stories
          .filter((s) => s.resource_subtype === 'comment_added' && s.created_by?.gid === userGid)
          .reduce((max, s) => (s.created_at && s.created_at > max ? s.created_at : max), '');
        for (const s of stories) {
          if (s.resource_subtype !== 'comment_added') continue;
          if (!s.created_at || new Date(s.created_at) < since) continue;
          if (s.created_by?.gid === userGid) continue;
          // Liked by me = seen; replied after = handled. Both states live in Asana.
          if (s.liked) continue;
          if (myLastComment && myLastComment > s.created_at) continue;
          const html = s.html_text ?? '';
          const isMention =
            html.includes(`data-asana-gid="${userGid}"`) || html.includes(`/profile/${userGid}`);
          if (!isMention) continue;
          mentions.push({
            storyGid: s.gid,
            taskGid: task.gid,
            taskName: task.name,
            projectName: task.projects?.[0]?.name,
            author: s.created_by?.name ?? 'Inconnu',
            text: s.text ?? '',
            createdAt: s.created_at,
            url: `https://app.asana.com/0/0/${task.gid}/${s.gid}/f`,
            taskCompleted: task.completed,
          });
        }
      }
    });
    await Promise.all(workers);

    mentions.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return mentions;
  }

  /** Like a story (used as a cross-device "seen" marker). */
  async likeStory(storyGid: string): Promise<boolean> {
    try {
      await this.client.put(`/stories/${storyGid}`, { data: { liked: true } });
      return true;
    } catch {
      return false;
    }
  }

  /** Post a comment on a task. Returns true on success. */
  async addComment(taskGid: string, text: string): Promise<boolean> {
    try {
      await this.client.post(`/tasks/${taskGid}/stories`, { data: { text } });
      return true;
    } catch {
      return false;
    }
  }

  /** Incomplete tasks assigned to me and due today or earlier. */
  async getTodayTasks(workspaceGid: string): Promise<TodayTask[]> {
    const res = await this.client.get('/tasks', {
      params: {
        assignee: 'me',
        workspace: workspaceGid,
        completed_since: 'now',
        limit: 100,
        opt_fields: 'name,due_on,permalink_url,projects.name',
      },
    });
    const raw: RawTask[] = res.data?.data ?? [];
    const today = localIsoDate(new Date());

    const tasks: TodayTask[] = raw
      .filter((t) => t.due_on && t.due_on <= today)
      .map((t) => ({
        gid: t.gid,
        name: t.name,
        projectName: t.projects?.[0]?.name,
        dueOn: t.due_on ?? undefined,
        overdue: (t.due_on ?? '') < today,
        url: t.permalink_url || `https://app.asana.com/0/0/${t.gid}/f`,
      }));

    tasks.sort((a, b) => (a.dueOn ?? '').localeCompare(b.dueOn ?? '') || a.name.localeCompare(b.name));
    return tasks;
  }

  /**
   * Recently-modified tasks the user follows. Uses the task search API
   * (Premium); falls back to the user's assigned tasks on 402.
   */
  private async getRecentFollowedTasks(workspaceGid: string, since: Date): Promise<RawTask[]> {
    const optFields = 'name,completed,permalink_url,projects.name,modified_at';

    if (this.searchAvailable) {
      try {
        const res = await this.client.get(`/workspaces/${workspaceGid}/tasks/search`, {
          params: {
            'followers.any': 'me',
            'modified_at.after': since.toISOString(),
            sort_by: 'modified_at',
            sort_ascending: false,
            limit: MENTION_TASK_SCAN_LIMIT,
            opt_fields: optFields,
          },
        });
        return res.data?.data ?? [];
      } catch (error: any) {
        const status = error?.response?.status;
        // 402 = workspace without Premium: the search API is off, remember it.
        if (status === 402) this.searchAvailable = false;
        else throw error;
      }
    }

    // Fallback: my open tasks, most recently modified first.
    const res = await this.client.get('/tasks', {
      params: {
        assignee: 'me',
        workspace: workspaceGid,
        completed_since: since.toISOString(),
        limit: 100,
        opt_fields: optFields,
      },
    });
    const raw: RawTask[] = res.data?.data ?? [];
    return raw
      .filter((t) => !t.modified_at || new Date(t.modified_at) >= since)
      .sort((a, b) => (b.modified_at ?? '').localeCompare(a.modified_at ?? ''))
      .slice(0, MENTION_TASK_SCAN_LIMIT);
  }

  /** All stories of a task (paginated, capped at 5 pages of 100). */
  private async getStories(taskGid: string): Promise<RawStory[]> {
    const stories: RawStory[] = [];
    let offset: string | undefined;
    for (let page = 0; page < 5; page++) {
      const res = await this.client.get(`/tasks/${taskGid}/stories`, {
        params: {
          limit: 100,
          offset,
          opt_fields: 'type,resource_subtype,created_at,created_by.gid,created_by.name,text,html_text,liked',
        },
      });
      stories.push(...(res.data?.data ?? []));
      offset = res.data?.next_page?.offset;
      if (!offset) break;
    }
    return stories;
  }
}

/** yyyy-mm-dd in the machine's local timezone (Asana due_on is date-only). */
export function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
