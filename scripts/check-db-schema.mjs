import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
try {
    const rows = await prisma.$queryRawUnsafe("PRAGMA table_info(Product)");
    console.log("Product columns:", rows.map((r) => r.name).join(", "));
}
catch (e) {
    console.error(e.message);
}
finally {
    await prisma.$disconnect();
}
