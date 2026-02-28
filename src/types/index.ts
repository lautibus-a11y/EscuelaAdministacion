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
  diagnosis?: string;
  responsible_teacher_id?: string;
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

export type CourseRole = 'Titular' | 'Suplente' | 'Coordinador';

export interface Course {
  id: string;
  institution_id: string;
  name: string;
  year: number;
  description?: string;
  created_at: string;
}

export interface CourseTeacher {
  id: string;
  course_id: string;
  teacher_id: string;
  role: CourseRole;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
}

export interface Substitution {
  id: string;
  course_id: string;
  original_teacher_id: string;
  substitute_teacher_id: string;
  start_date: string;
  end_date?: string;
  reason?: string;
  is_active: boolean;
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
