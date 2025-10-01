export type UserRole = "DISTRICT_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ORBITSTAFF";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  districtId?: string;
  parentOfStudentId?: string;
  isActive: boolean;
}

export interface District {
  id: string;
  name: string;
  code: string; // 4-digit or custom
  plan: "BASIC" | "PRO";
  schoolId?: string;
  ownerId: string; // District Admin
}

export interface Class {
  id: string;
  districtId: string;
  name: string;
  teacherId: string;
  studentIds: string[];
  googleClassroomId?: string;
}

export interface Group {
  id: string;
  districtId: string;
  name: string;
  adminIds: string[];
  autoAllow: boolean;
  memberIds: string[];
  status: "PENDING" | "APPROVED";
}

export interface Announcement {
  id: string;
  districtId: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: string;
}

export interface Pass {
  id: string;
  studentId: string;
  issuedBy: string;
  status: "ACTIVE" | "USED" | "REVOKED";
  createdAt: string;
}