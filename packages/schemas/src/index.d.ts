import { z } from 'zod';
export declare const registerTenantSchema: z.ZodObject<{
    tenantName: z.ZodString;
    slug: z.ZodString;
    fullName: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    slug: string;
    email: string;
    password: string;
    tenantName: string;
    fullName: string;
}, {
    slug: string;
    email: string;
    password: string;
    tenantName: string;
    fullName: string;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type RegisterTenantInput = z.infer<typeof registerTenantSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
//# sourceMappingURL=index.d.ts.map