import type { UserRole, UserStatus } from "@english-coach/domain";

export type AccessState = "anonymous" | "student_pending" | "student_rejected" | "student_approved" | "admin_approved";

export type AccessArea = "public" | "auth" | "pending" | "rejected" | "app" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  status: UserStatus;
}

export interface AuthBootstrapState {
  user: AuthUser | null;
  accessState: AccessState;
  isError: boolean;
  isPending: boolean;
  isReady: boolean;
}
