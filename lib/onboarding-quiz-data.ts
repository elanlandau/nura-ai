export type QuizLocale = 'en' | 'he';

export type QuizOptionDef = {
  id: string;
  /** Stored in preferences_summary (English, for the model). */
  summaryLine: string;
  label: Record<QuizLocale, string>;
};

export type QuizQuestionDef = {
  id: string;
  /** Short key for API validation */
  key: string;
  prompt: Record<QuizLocale, string>;
  options: QuizOptionDef[];
};

/** 10 strategic MCQ items (American-style). */
export const ONBOARDING_QUIZ: QuizQuestionDef[] = [
  {
    id: 'q1',
    key: 'field',
    prompt: {
      en: 'What best describes your professional field?',
      he: 'איזה תחום מקצועי מתאר אותך הכי טוב?',
    },
    options: [
      { id: 'tech', summaryLine: 'Professional field: Technology & software', label: { en: 'Technology & software', he: 'טכנולוגיה ותוכנה' } },
      { id: 'finance', summaryLine: 'Professional field: Finance & legal', label: { en: 'Finance & legal', he: 'פיננסים ומשפטים' } },
      { id: 'health', summaryLine: 'Professional field: Healthcare & sciences', label: { en: 'Healthcare & sciences', he: 'בריאות ומדעים' } },
      { id: 'creative', summaryLine: 'Professional field: Creative & media', label: { en: 'Creative & media', he: 'יצירה ותקשורת' } },
      { id: 'ops', summaryLine: 'Professional field: Operations & administration', label: { en: 'Operations & administration', he: 'תפעול וניהול' } },
      { id: 'other_f', summaryLine: 'Professional field: Other / mixed', label: { en: 'Other / mixed', he: 'אחר / משולב' } },
    ],
  },
  {
    id: 'q2',
    key: 'role',
    prompt: {
      en: 'Which best matches your role?',
      he: 'איזה תפקיד מתאים לך?',
    },
    options: [
      { id: 'ic', summaryLine: 'Role: Individual contributor', label: { en: 'Individual contributor', he: 'עצמאי / מומחה' } },
      { id: 'mgr', summaryLine: 'Role: Manager', label: { en: 'Manager', he: 'מנהל' } },
      { id: 'exec', summaryLine: 'Role: Executive / leadership', label: { en: 'Executive / leadership', he: 'הנהלה בכירה' } },
      { id: 'founder', summaryLine: 'Role: Founder / entrepreneur', label: { en: 'Founder / entrepreneur', he: 'יזם / יזמת' } },
      { id: 'student', summaryLine: 'Role: Student / other', label: { en: 'Student / other', he: 'סטודנט / אחר' } },
    ],
  },
  {
    id: 'q3',
    key: 'goal',
    prompt: {
      en: 'What is your main goal with Nura?',
      he: 'מהי המטרה העיקרית שלך עם נורה?',
    },
    options: [
      { id: 'sched', summaryLine: 'Main goal: Save time on scheduling & meetings', label: { en: 'Scheduling & meetings', he: 'קביעת פגישות וזמן' } },
      { id: 'inbox', summaryLine: 'Main goal: Tame inbox & email', label: { en: 'Inbox & email', he: 'דוא״ל ותיבה' } },
      { id: 'tasks', summaryLine: 'Main goal: Tasks & follow-ups', label: { en: 'Tasks & follow-ups', he: 'משימות ומעקבים' } },
      { id: 'all', summaryLine: 'Main goal: Full assistant (calendar, email, tasks)', label: { en: 'All of the above', he: 'הכול יחד' } },
    ],
  },
  {
    id: 'q4',
    key: 'workday',
    prompt: {
      en: 'How would you describe your typical workday?',
      he: 'איך היית מתאר את יום העבודה הטיפוסי שלך?',
    },
    options: [
      { id: 'light', summaryLine: 'Workday: Light & flexible', label: { en: 'Light & flexible', he: 'קל וגמיש' } },
      { id: 'struct', summaryLine: 'Workday: Structured & busy', label: { en: 'Structured & busy', he: 'מובנה ועמוס' } },
      { id: 'intense', summaryLine: 'Workday: High intensity / always on', label: { en: 'High intensity / always on', he: 'עצימות גבוהה' } },
    ],
  },
  {
    id: 'q5',
    key: 'tone',
    prompt: {
      en: 'Preferred tone for Nura’s replies?',
      he: 'איזה טון נוח לך בתשובות של נורה?',
    },
    options: [
      { id: 'pro', summaryLine: 'Tone preference: Professional & concise', label: { en: 'Professional & concise', he: 'מקצועי ותמציתי' } },
      { id: 'warm', summaryLine: 'Tone preference: Warm & friendly', label: { en: 'Warm & friendly', he: 'חם וידידותי' } },
      { id: 'direct', summaryLine: 'Tone preference: Direct & efficient', label: { en: 'Direct & efficient', he: 'ישיר ויעיל' } },
    ],
  },
  {
    id: 'q6',
    key: 'summary_len',
    prompt: {
      en: 'How long should summaries usually be?',
      he: 'כמה ארוכות בדרך כלל תרצה שתהיינה סיכומים?',
    },
    options: [
      { id: 'brief', summaryLine: 'Summary length: Brief bullets', label: { en: 'Brief bullets', he: 'נקודות קצרות' } },
      { id: 'balanced', summaryLine: 'Summary length: Balanced', label: { en: 'Balanced', he: 'מאוזן' } },
      { id: 'detail', summaryLine: 'Summary length: Detailed when needed', label: { en: 'Detailed when needed', he: 'מפורט לפי צורך' } },
    ],
  },
  {
    id: 'q7',
    key: 'automate',
    prompt: {
      en: 'What would you automate first?',
      he: 'מה היית רוצה לאוטומט קודם?',
    },
    options: [
      { id: 'cal', summaryLine: 'Automation priority: Calendar & meetings', label: { en: 'Calendar & meetings', he: 'יומן ופגישות' } },
      { id: 'em', summaryLine: 'Automation priority: Email triage', label: { en: 'Email triage', he: 'סינון דוא״ל' } },
      { id: 'rem', summaryLine: 'Automation priority: Reminders & tasks', label: { en: 'Reminders & tasks', he: 'תזכורות ומשימות' } },
    ],
  },
  {
    id: 'q8',
    key: 'reminders',
    prompt: {
      en: 'How do you prefer reminders?',
      he: 'איך אתה מעדיף תזכורות?',
    },
    options: [
      { id: 'inapp', summaryLine: 'Reminders: In-app only', label: { en: 'In-app only', he: 'באפליקציה בלבד' } },
      { id: 'email', summaryLine: 'Reminders: Email nudges', label: { en: 'Email nudges', he: 'בדוא״ל' } },
      { id: 'both', summaryLine: 'Reminders: Both in-app and email', label: { en: 'Both', he: 'גם וגם' } },
    ],
  },
  {
    id: 'q9',
    key: 'team',
    prompt: {
      en: 'Do you mostly work solo or with a team?',
      he: 'אתה בעיקר לבד או עם צוות?',
    },
    options: [
      { id: 'solo', summaryLine: 'Work context: Mostly solo', label: { en: 'Mostly solo', he: 'בעיקר לבד' } },
      { id: 'small', summaryLine: 'Work context: Small team (2–10)', label: { en: 'Small team (2–10)', he: 'צוות קטן (2–10)' } },
      { id: 'large', summaryLine: 'Work context: Larger organization', label: { en: 'Larger organization', he: 'ארגון גדול יותר' } },
    ],
  },
  {
    id: 'q10',
    key: 'frequency',
    prompt: {
      en: 'How often do you expect to use Nura?',
      he: 'באיזו תדירות אתה מתכנן להשתמש בנורה?',
    },
    options: [
      { id: 'daily', summaryLine: 'Expected usage: Daily', label: { en: 'Daily', he: 'מדי יום' } },
      { id: 'weekly', summaryLine: 'Expected usage: A few times a week', label: { en: 'A few times a week', he: 'כמה פעמים בשבוע' } },
      { id: 'asap', summaryLine: 'Expected usage: As needed', label: { en: 'As needed', he: 'לפי צורך' } },
    ],
  },
];

export function getExpectedQuestionIds(): string[] {
  return ONBOARDING_QUIZ.map((q) => q.id);
}

export function findOptionSummaryLine(questionId: string, optionId: string): string | null {
  const q = ONBOARDING_QUIZ.find((x) => x.id === questionId);
  if (!q) return null;
  const o = q.options.find((x) => x.id === optionId);
  return o?.summaryLine ?? null;
}
