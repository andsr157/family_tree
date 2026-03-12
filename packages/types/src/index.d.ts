export interface AuthUser {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    isPlatformAdmin: boolean;
    defaultFocalPersonId: string | null;
    preferredZoomLevel: number;
}
export type TenantRole = 'owner' | 'admin' | 'member';
export interface TenantInfo {
    id: string;
    name: string;
    slug: string;
    role: TenantRole;
}
//# sourceMappingURL=index.d.ts.map