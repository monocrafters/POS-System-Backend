export type BackupSnapshotV1 = {
    version: 1;
    shopId: string;
    createdAt: string;
    data: {
        users: Array<{
            id: string;
            username: string;
            password: string;
            fullName: string;
            role: string;
            isActive: boolean;
            createdAt: string;
            updatedAt: string;
        }>;
        shopSettings: {
            id: string;
            shopName: string;
            shopTagline: string;
            receiptPhone: string | null;
            returnsEnabled: boolean;
            returnRefundPercent: number;
            updatedAt: string;
        } | null;
        products: Array<{
            id: string;
            name: string;
            price: number;
            purchaseCost: number;
            stock: number;
            isActive: boolean;
            createdAt: string;
            updatedAt: string;
        }>;
        productBarcodes: Array<{
            id: string;
            barcode: string;
            productId: string;
            createdAt: string;
        }>;
        bills: Array<{
            id: string;
            billNumber: string;
            cashierId: string;
            subtotal: number;
            discountAmount: number;
            total: number;
            itemCount: number;
            status: string;
            createdAt: string;
        }>;
        billItems: Array<{
            id: string;
            billId: string;
            productId: string;
            barcode: string;
            name: string;
            unitPrice: number;
            unitCost: number;
            quantity: number;
            lineDiscount: number;
            lineTotal: number;
        }>;
        returns: Array<{
            id: string;
            returnNumber: string;
            billId: string;
            cashierId: string;
            refundAmount: number;
            refundPercent: number;
            itemCount: number;
            createdAt: string;
        }>;
        returnItems: Array<{
            id: string;
            returnId: string;
            billItemId: string;
            productId: string;
            name: string;
            barcode: string;
            unitPrice: number;
            quantity: number;
            lineRefund: number;
        }>;
        recurringExpenses: Array<{
            id: string;
            title: string;
            amount: number;
            category: string;
            customCategory: string | null;
            payFrequency: string;
            nextDueDate: string;
            remindDaysBefore: number;
            note: string | null;
            isActive: boolean;
            createdAt: string;
            updatedAt: string;
        }>;
        expenses: Array<{
            id: string;
            title: string;
            amount: number;
            category: string;
            customCategory: string | null;
            note: string | null;
            expenseDate: string;
            recurringExpenseId: string | null;
            createdAt: string;
            updatedAt: string;
        }>;
    };
};
