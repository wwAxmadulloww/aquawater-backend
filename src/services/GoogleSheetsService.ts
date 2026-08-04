// Importing the `google` barrel pulls in type declarations for all ~330
// Google APIs (tens of MB of .d.ts), which made `tsc` — both locally and on
// Vercel's build machine — take many minutes to type-check this file alone,
// once repeatedly stalling the whole deploy. Import only the Sheets client;
// `auth` here is the same googleapis-common AuthPlus the narrow client
// expects, so this avoids the JWT/OAuth2Client type mismatch that a
// standalone `google-auth-library` import produces against it.
import { sheets as sheetsApi, auth as googleAuth } from 'googleapis/build/src/apis/sheets';

export interface SheetProductRow {
    id: string;
    name: string;
    category: string;
    productType: string;
    description: string;
    price: number;
    imageUrl: string;
    inStock: boolean;
    status: string;
}

export interface SheetOrderRow {
    id: string;
    customerPhone: string;
    customerName: string;
    itemsSummary: string;
    totalPrice: number;
    deliveryAddress: string;
    deliveryDate: string;
    deliveryTimeSlot: string;
    paymentMethod: string;
    status: string;
    createdAt: string;
}

export class GoogleSheetsService {
    private static getAuthClient() {
        const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (!clientEmail || !privateKey) {
            return null;
        }

        return new googleAuth.JWT({
            email: clientEmail,
            key: privateKey,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
    }

    private static getSpreadsheetId(sheetType?: 'products' | 'orders'): string | null {
        if (sheetType === 'products' && process.env.GOOGLE_PRODUCTS_SHEET_ID) {
            return process.env.GOOGLE_PRODUCTS_SHEET_ID;
        }
        if (sheetType === 'orders' && process.env.GOOGLE_ORDERS_SHEET_ID) {
            return process.env.GOOGLE_ORDERS_SHEET_ID;
        }
        return process.env.GOOGLE_SHEET_ID || null;
    }

    /** Column titles written above the first row of each tab. */
    private static readonly HEADERS: Record<string, string[]> = {
        Products: [
            'ID', 'Nomi', 'Kategoriya', 'Turi', 'Tavsif', 'Narxi',
            'Rasm', 'Sotuvda', 'Holati', 'Qo\'shilgan vaqti',
        ],
        Orders: [
            'ID', 'Telefon', 'Mijoz', 'Mahsulotlar', 'Jami summa', 'Manzil',
            'Yetkazish sanasi', 'Vaqt', 'To\'lov', 'Holati', 'Yaratilgan vaqti',
        ],
    };

    /**
     * Makes sure the tab exists and carries its column titles.
     *
     * A spreadsheet handed over for this has one default tab, so appending to
     * `Products!A:Z` failed on every single order and the only sign was a line
     * in a server log nobody reads — the owner saw a connected integration that
     * silently wrote nothing. Creating the tab makes setup one step: paste the
     * ids, share the file, done.
     *
     * A failure here is swallowed: a tab that already exists is the normal case
     * and reports as an error, and the append that follows is the real test.
     */
    private static async ensureSheet(sheets: any, spreadsheetId: string, sheetName: string): Promise<void> {
        try {
            const meta = await sheets.spreadsheets.get({ spreadsheetId });
            const exists = (meta.data.sheets || []).some(
                (s: any) => s.properties?.title === sheetName,
            );
            if (exists) return;

            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
            });

            const headers = this.HEADERS[sheetName];
            if (headers) {
                await sheets.spreadsheets.values.update({
                    spreadsheetId,
                    range: `${sheetName}!A1`,
                    valueInputOption: 'RAW',
                    requestBody: { values: [headers] },
                });
            }
            console.log(`[GoogleSheetsService] Created the "${sheetName}" tab.`);
        } catch (err: any) {
            console.warn(`[GoogleSheetsService] Could not prepare "${sheetName}":`, err?.message || err);
        }
    }

    /**
     * Appends a row of values to a specific sheet (tab)
     */
    public static async appendRow(sheetName: string, rowValues: (string | number | boolean)[], sheetType?: 'products' | 'orders'): Promise<boolean> {
        try {
            const auth = this.getAuthClient();
            const spreadsheetId = this.getSpreadsheetId(sheetType);

            if (!auth || !spreadsheetId) {
                console.warn(`[GoogleSheetsService] Google Sheets credentials missing. Skipping sync for "${sheetName}".`);
                return false;
            }

            const sheets = sheetsApi({ version: 'v4', auth });
            await this.ensureSheet(sheets, spreadsheetId, sheetName);

            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: `${sheetName}!A:Z`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [rowValues],
                },
            });

            console.log(`[GoogleSheetsService] Successfully appended row to ${sheetName} (Spreadsheet ID: ${spreadsheetId})`);
            return true;
        } catch (err) {
            console.error(`[GoogleSheetsService] Error appending to ${sheetName}:`, err);
            return false;
        }
    }

    /**
     * Reads all rows from a sheet (tab)
     */
    public static async getRows(sheetName: string, sheetType?: 'products' | 'orders'): Promise<any[][] | null> {
        try {
            const auth = this.getAuthClient();
            const spreadsheetId = this.getSpreadsheetId(sheetType);

            if (!auth || !spreadsheetId) {
                return null;
            }

            const sheets = sheetsApi({ version: 'v4', auth });
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `${sheetName}!A:Z`,
            });

            return response.data.values || [];
        } catch (err) {
            console.error(`[GoogleSheetsService] Error reading from ${sheetName}:`, err);
            return null;
        }
    }

    /**
     * Syncs a new Product to Google Sheets "Products" tab
     */
    public static async syncProduct(product: any): Promise<boolean> {
        return this.appendRow('Products', [
            product._id?.toString() || product.id || '',
            product.name || '',
            product.category || '',
            product.productType || 'product',
            product.description || '',
            product.price || 0,
            product.imageUrl || '',
            product.inStock !== false ? 'Xa' : 'Yo\'q',
            product.status || 'approved',
            new Date().toISOString(),
        ], 'products');
    }

    /**
     * Syncs a new Order to Google Sheets "Orders" tab
     */
    public static async syncOrder(order: any, userPhone: string, userName: string): Promise<boolean> {
        const itemsSummary = Array.isArray(order.items)
            ? order.items.map((i: any) => `${i.nameSnapshot || 'Mahsulot'} x ${i.qty}`).join(', ')
            : '';

        const addressStr = order.addressSnapshot
            ? `${order.addressSnapshot.region || ''}, ${order.addressSnapshot.city || ''}, ${order.addressSnapshot.street || ''} ${order.addressSnapshot.house || ''}`
            : '';

        /*
         * The accountant's row has to reconcile with the cash the courier
         * collected, so it is goods plus the delivery charge. Summing the line
         * items alone understated every regional order by the fee.
         */
        const goods = Array.isArray(order.items)
            ? order.items.reduce(
                (sum: number, i: any) => sum + ((i.priceSnapshot || 0) + (i.depositSnapshot || 0)) * i.qty, 0)
            : 0;
        const totalPrice = goods + Number(order.deliveryFee || 0);

        return this.appendRow('Orders', [
            order._id?.toString() || order.id || '',
            userPhone,
            userName,
            itemsSummary,
            totalPrice,
            addressStr,
            order.deliveryDate || '',
            order.deliveryTimeSlot || '',
            order.paymentMethod || 'cash',
            order.status || 'pending',
            new Date().toISOString(),
        ], 'orders');
    }
}
