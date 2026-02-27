export type UserRole = 'admin' | 'supervisor' | 'teacher';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  institution_id?: string;
}

export interface Institution {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  created_at: string;
}

export interface Student {
  id: string;
  institution_id: string;
  full_name: string;
  grade: string;
  observations: string;
  created_at: string;
}

export interface Teacher {
  id: string;
  full_name: string;
  dni: string;
  email: string;
  phone: string;
  created_at: string;
}

export type PositionType = 'Titular' | 'Suplente' | 'Interino';

export interface Position {
  id: string;
  institution_id: string;
  title: string;
  type: PositionType;
  linked_position_id?: string; // For Suplente/Interino linked to a Titular
  teacher_id?: string;
  status: 'Active' | 'Inactive';
  created_at: string;
}

export interface Visit {
  id: string;
  institution_id: string;
  visitor_id: string;
  visit_date: string;
  comments: string;
  status: 'Completed' | 'Pending';
  created_at: string;
}
