export const userRoleValues = ["student", "admin"] as const;
export const userStatusValues = ["pending", "approved", "rejected", "deleted"] as const;
export const verificationTypeValues = ["email_verification", "password_reset", "magic_link"] as const;

export type UserRole = (typeof userRoleValues)[number];
export type UserStatus = (typeof userStatusValues)[number];
export type VerificationType = (typeof verificationTypeValues)[number];