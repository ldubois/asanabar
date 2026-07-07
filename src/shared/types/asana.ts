/**
 * Normalised Asana objects, as exposed to the renderer.
 */

/** A comment (story) where the current user is @mentioned. */
export interface Mention {
  /** Story gid — unique id used for local archiving. */
  storyGid: string;
  taskGid: string;
  taskName: string;
  /** First project the task belongs to (display only). */
  projectName?: string;
  /** Comment author (display name). */
  author: string;
  /** Plain-text body of the comment. */
  text: string;
  /** ISO date the comment was posted. */
  createdAt: string;
  /** Deep link to the comment inside the task pane. */
  url: string;
  /** True when the task itself is completed. */
  taskCompleted?: boolean;
}

/** A task assigned to me, due today or overdue. */
export interface TodayTask {
  gid: string;
  name: string;
  projectName?: string;
  /** ISO date (yyyy-mm-dd) the task is due. */
  dueOn?: string;
  /** Due before today. */
  overdue: boolean;
  /** Permalink to the task. */
  url: string;
}

export type TrayStatus = 'green' | 'orange' | 'red' | 'gray';
