import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage, } from "zustand/middleware";
import type { AuthUser } from "@/types/auth";
import { safeJsonParse } from "@/lib/safe-json";
interface AuthState {
    isAuthenticated: boolean;
    user: AuthUser | null;
    token: string | null;
    remember: boolean;
    setAuth: (user: AuthUser, token: string, remember?: boolean) => void;
    logout: () => void;
}
const AUTH_KEY = "pos-auth";
function readRawAuth(name: string): string | null {
    if (typeof window === "undefined")
        return null;
    const raw = localStorage.getItem(name) ?? sessionStorage.getItem(name);
    if (!raw?.trim()) {
        localStorage.removeItem(name);
        sessionStorage.removeItem(name);
        return null;
    }
    if (!safeJsonParse(raw)) {
        localStorage.removeItem(name);
        sessionStorage.removeItem(name);
        return null;
    }
    return raw;
}
const authStorage: StateStorage = {
    getItem: (name) => readRawAuth(name),
    setItem: (name, value) => {
        if (typeof window === "undefined")
            return;
        if (!value?.trim()) {
            authStorage.removeItem(name);
            return;
        }
        const parsed = safeJsonParse<{
            state?: {
                remember?: boolean;
            };
        }>(value);
        const remember = parsed?.state?.remember === true;
        if (remember) {
            localStorage.setItem(name, value);
            sessionStorage.removeItem(name);
        }
        else {
            sessionStorage.setItem(name, value);
            localStorage.removeItem(name);
        }
    },
    removeItem: (name) => {
        if (typeof window === "undefined")
            return;
        localStorage.removeItem(name);
        sessionStorage.removeItem(name);
    },
};
export const useAuthStore = create<AuthState>()(persist((set) => ({
    isAuthenticated: false,
    user: null,
    token: null,
    remember: false,
    setAuth: (user, token, remember = false) => {
        set({ isAuthenticated: true, user, token, remember });
    },
    logout: () => {
        set({
            isAuthenticated: false,
            user: null,
            token: null,
            remember: false,
        });
        authStorage.removeItem(AUTH_KEY);
    },
}), {
    name: AUTH_KEY,
    storage: createJSONStorage(() => authStorage),
    partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
        remember: state.remember,
    }),
}));

