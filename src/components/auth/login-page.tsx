"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useAppStore } from "@/store/app-store";
import { apiGetShopBranding, apiLogin } from "@/lib/api-client";
import { DEFAULT_SHOP_NAME, DEFAULT_SHOP_TAGLINE, } from "@/lib/shop-settings";
import { cn } from "@/lib/utils";
const loginSchema = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
    remember: z.boolean().optional(),
});
type LoginForm = z.infer<typeof loginSchema>;
function SignInButton({ loading }: {
    loading: boolean;
}) {
    return (<button type="submit" disabled={loading} aria-busy={loading} className={cn("mt-2 flex h-[52px] w-full items-center justify-center rounded-2xl", "bg-[#E31837] text-sm font-bold tracking-[0.14em] text-white uppercase", "shadow-[0_8px_28px_rgba(227,24,55,0.32)] transition-colors duration-200", "hover:bg-[#c91430] disabled:cursor-not-allowed disabled:opacity-85")}>
      {loading ? (<span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-label="Signing in"/>) : (<span>Sign In</span>)}
    </button>);
}
export function LoginPage() {
    const setAuth = useAuthStore((s) => s.setAuth);
    const initElectronBridge = useAppStore((s) => s.initElectronBridge);
    const version = useAppStore((s) => s.version);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [shopName, setShopName] = useState(DEFAULT_SHOP_NAME);
    const [shopTagline, setShopTagline] = useState(DEFAULT_SHOP_TAGLINE);
    const { register, handleSubmit, formState: { errors }, } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
        defaultValues: { username: "", password: "", remember: false },
    });
    useEffect(() => {
        initElectronBridge();
    }, [initElectronBridge]);
    useEffect(() => {
        void apiGetShopBranding()
            .then((res) => {
            setShopName(res.branding.shopName);
            setShopTagline(res.branding.shopTagline);
            if (typeof document !== "undefined") {
                document.title = res.branding.shopName;
            }
        })
            .catch(() => { });
    }, []);
    const onSubmit = async (data: LoginForm) => {
        setIsLoading(true);
        setApiError(null);
        try {
            const res = await apiLogin(data.username, data.password);
            setAuth(res.user, res.token, data.remember);
        }
        catch (err) {
            setApiError(err instanceof Error ? err.message : "Login failed");
        }
        finally {
            setIsLoading(false);
        }
    };
    return (<div className="flex h-screen w-full items-center justify-center bg-white p-6 sm:p-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} className="bata-login-container w-full max-w-[900px] overflow-hidden rounded-[40px]">
        <div className="flex min-h-[500px] flex-col md:min-h-[540px] md:flex-row">
          
          <div className="relative flex flex-1 flex-col items-center justify-center bg-[#E31837] px-10 py-14 text-center text-white md:rounded-l-[40px]">
            <div className="pointer-events-none absolute inset-0 rounded-l-[40px] bg-gradient-to-br from-white/[0.12] via-transparent to-black/[0.08]"/>
            <div className="pointer-events-none absolute -left-10 top-0 h-56 w-56 rounded-full bg-white/10 blur-3xl"/>
            <div className="pointer-events-none absolute bottom-0 right-0 h-44 w-44 rounded-full bg-black/10 blur-2xl"/>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }} className="relative z-10 max-w-[320px]">
              <h2 className="text-[2.5rem] font-extrabold leading-tight tracking-tight sm:text-[3rem]">
                {shopName}
              </h2>
              <p className="mt-3 text-lg font-semibold tracking-wide text-white/95">
                {shopTagline}
              </p>

              <p className="mt-8 text-[15px] font-medium leading-relaxed text-white/88">
                Fast billing, real-time sales, and smooth store operations. Sign
                in with your staff username and password.
              </p>

              <div className="mx-auto my-9 h-px w-14 bg-white/25"/>

              <p className="text-[14px] leading-relaxed text-white/72">
                Use your staff username and password to open your workspace.
                New users are set up by the store manager.
              </p>
            </motion.div>
          </div>

          
          <div className="flex flex-1 flex-col justify-center bg-white px-8 py-10 sm:px-12 sm:py-14 md:rounded-r-[40px] md:px-14">
            <div className="mx-auto w-full max-w-[360px]">
              <h1 className="text-[2.1rem] font-bold tracking-tight text-neutral-900 sm:text-[2.35rem]">
                Sign In
              </h1>
              <p className="mt-2 text-[15px] font-medium text-neutral-500">
                Enter your username and password to continue
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-10 space-y-5">
                {apiError && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {apiError}
                  </motion.div>)}

                <div className="space-y-1.5">
                  <input id="username" type="text" placeholder="Username" autoComplete="username" aria-invalid={!!errors.username} className="bata-field" {...register("username")}/>
                  {errors.username && (<p className="text-xs font-medium text-red-600">
                      {errors.username.message}
                    </p>)}
                </div>

                <div className="space-y-1.5">
                  <div className="relative">
                    <input id="password" type={showPassword ? "text" : "password"} placeholder="Password" autoComplete="current-password" aria-invalid={!!errors.password} className="bata-field pr-12" {...register("password")}/>
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors hover:text-neutral-600" aria-label={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? (<EyeOff className="h-[18px] w-[18px]"/>) : (<Eye className="h-[18px] w-[18px]"/>)}
                    </button>
                  </div>
                  {errors.password && (<p className="text-xs font-medium text-red-600">
                      {errors.password.message}
                    </p>)}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex cursor-pointer select-none items-center gap-2.5">
                    <input type="checkbox" className="h-4 w-4 rounded-md border-neutral-300 accent-[#E31837]" {...register("remember")}/>
                    <span className="text-[14px] font-medium text-neutral-600">
                      Remember me
                    </span>
                  </label>
                  <button type="button" className="text-[14px] font-medium text-neutral-500 transition-colors hover:text-[#E31837]">
                    Forgot password?
                  </button>
                </div>

                <SignInButton loading={isLoading}/>
              </form>

              {version && (<p className="mt-10 text-center text-[11px] font-medium text-neutral-400">
                  {shopName} · v{version}
                </p>)}
            </div>
          </div>
        </div>
      </motion.div>
    </div>);
}

