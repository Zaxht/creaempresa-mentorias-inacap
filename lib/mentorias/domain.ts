export const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const MENTORSHIP_STATUSES = [
  'Suspendida',
  'En proceso',
  'Terminada',
  'No corresponde',
  'Esperando derivación',
  'Derivada',
] as const;

export const SERVICES = [
  'Mentoría administrativa y financiera',
  'Mentoría en gestión comercial',
  'Mentoría en informática y ciberseguridad',
] as const;

export const CHECK_OPTIONS = [
  'Pendiente',
  'Sí',
  'No',
  'No corresponde',
] as const;
export const SESSION_STATUSES = [
  'Pendiente',
  'Agendada',
  'Realizada',
  'Reprogramada',
] as const;
export const ROLES = ['Administrador', 'Mentor', 'Mentoreado'] as const;

export type Role = (typeof ROLES)[number];
export type View =
  | 'dashboard'
  | 'mentors'
  | 'mentees'
  | 'mentorships'
  | 'profile'
  | 'export';
export type MentorshipStatus = (typeof MENTORSHIP_STATUSES)[number];
export type SessionStatus = (typeof SESSION_STATUSES)[number];
export type CheckValue = (typeof CHECK_OPTIONS)[number];

export type Attachment = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  path?: string;
};

export type SessionRecord = {
  id?: string;
  version?: number;
  number: number;
  date: string;
  status: SessionStatus;
  summary: string;
  photo?: Attachment;
  document?: Attachment;
};

export type Mentor = {
  version?: number;
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  expertise: string[];
  bio: string;
  photo?: string;
  photoPath?: string;
};

export type Mentee = {
  version?: number;
  id: string;
  name: string;
  venture: string;
  stage: string;
  email: string;
  phone: string;
  need: string;
  photo?: string;
  photoPath?: string;
};

export type Mentorship = {
  version?: number;
  id: string;
  sourceNumber: number;
  mentorId: string;
  menteeId: string;
  month: string;
  hours: number;
  space: string;
  status: MentorshipStatus;
  service: string;
  formalization: CheckValue;
  planningSir: CheckValue;
  executionSir: CheckValue;
  paidAt: string;
  goal: string;
  sessions: SessionRecord[];
};

export type AppState = {
  mentors: Mentor[];
  mentees: Mentee[];
  mentorships: Mentorship[];
};

export type ExportOptions = {
  summary: boolean;
  mentors: boolean;
  mentees: boolean;
  mentorships: boolean;
  sessions: boolean;
  attachments: boolean;
};
