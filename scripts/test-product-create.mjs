import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const barcode = `TEST${Date.now()}`;
try {
    const r = await prisma.product.create({
        data: {
            name: "test",
            price: 10,
            purchaseCost: 5,
            stock: 1,
            barcodes: { create: [{ barcode }] },
        },
    });
    console.log("OK", r.id);
    await prisma.product.delete({ where: { id: r.id } });
}
catch (e) {
    console.error("ERR", e.message);
    if (e.meta) console.error("meta", e.meta);
}
finally {
    await prisma.$disconnect();
}
