import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
async function main() {
    const adminPass = await bcrypt.hash("admin123", 12);
    const cashierPass = await bcrypt.hash("cashier123", 12);
    const admin = await prisma.user.upsert({
        where: { username: "admin" },
        update: {},
        create: {
            username: "admin",
            password: adminPass,
            fullName: "Store Admin",
            role: "ADMIN",
            isActive: true,
        },
    });
    await prisma.user.upsert({
        where: { username: "cashier" },
        update: {},
        create: {
            username: "cashier",
            password: cashierPass,
            fullName: "Counter Cashier",
            role: "CASHIER",
            isActive: true,
        },
    });
    await prisma.shopSettings.upsert({
        where: { id: "global" },
        update: {},
        create: {
            id: "global",
            shopName: "Bata POS",
            shopTagline: "Retail Store",
            returnsEnabled: true,
            returnRefundPercent: 100,
        },
    });
    console.log("[seed] Default users ready:");
    console.log("  Admin   → username: admin   password: admin123");
    console.log("  Cashier → username: cashier password: cashier123");
    console.log("  Admin id:", admin.id);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());

