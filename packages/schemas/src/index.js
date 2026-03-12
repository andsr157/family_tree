"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerTenantSchema = void 0;
const zod_1 = require("zod");
exports.registerTenantSchema = zod_1.z.object({
    tenantName: zod_1.z.string().min(3, 'Nama keluarga minimal 3 karakter').max(255),
    slug: zod_1.z
        .string()
        .min(3)
        .max(100)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung'),
    fullName: zod_1.z.string().min(2, 'Nama minimal 2 karakter').max(255),
    email: zod_1.z.string().email('Format email tidak valid'),
    password: zod_1.z.string().min(8, 'Password minimal 8 karakter'),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
//# sourceMappingURL=index.js.map