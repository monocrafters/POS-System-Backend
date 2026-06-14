export type UserRole = "ADMIN" | "CASHIER";
export interface AuthUser {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
}
export interface LoginResponse {
    success: true;
    token: string;
    user: AuthUser;
}
export interface RegisterResponse {
    success: true;
    message: string;
    user: AuthUser;
}
export interface ApiError {
    success: false;
    message: string;
}

