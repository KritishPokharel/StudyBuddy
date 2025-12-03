
export type NotificationType = 'quiz_ready' | 'midterm_review' | 'goal_reminder' | 'new_resource' | 'study_tip';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: string;
  read: boolean;
}
