import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ProductImage from '../models/ProductImage';
import { AuthRequest } from '../middleware/auth';

/**
 * Product photos: taken from the shopkeeper's own phone or laptop.
 *
 * The catalogue used to hold a URL typed by hand, which meant every photo was
 * a link to somebody else's website — the shop's own listing went blank the day
 * that site reorganised its files, and there was no way to put up a picture of
 * the actual bottle without first publishing it somewhere else.
 */

/**
 * The first bytes of the formats a browser will reliably display.
 *
 * Checked instead of the declared Content-Type because that header is written
 * by whoever is calling: a script can label anything `image/png`. What a file
 * *starts with* is what a browser will act on, so that is what gets verified.
 */
const SIGNATURES: { type: string; matches: (b: Buffer) => boolean }[] = [
    { type: 'image/jpeg', matches: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
    {
        type: 'image/png',
        matches: b => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    },
    {
        type: 'image/webp',
        matches: b => b.subarray(0, 4).toString('ascii') === 'RIFF'
            && b.subarray(8, 12).toString('ascii') === 'WEBP',
    },
    {
        type: 'image/gif',
        matches: b => ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('ascii')),
    },
];

/** The largest photo accepted, after the browser has already shrunk it. */
const MAX_BYTES = 3 * 1024 * 1024;

export const uploadProductImage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const body = req.body;

        if (!Buffer.isBuffer(body) || body.length === 0) {
            res.status(400).json({ message: 'Rasm yuborilmadi' });
            return;
        }
        if (body.length > MAX_BYTES) {
            res.status(413).json({ message: 'Rasm juda katta — 3 MB dan kichik bo\'lsin' });
            return;
        }

        const signature = SIGNATURES.find(s => s.matches(body));
        if (!signature) {
            res.status(400).json({ message: 'Faqat rasm yuklash mumkin (JPG, PNG, WEBP, GIF)' });
            return;
        }

        const image = await ProductImage.create({
            data: body,
            // The verified signature wins over the declared type, so a PNG
            // labelled as a GIF is still served as what it actually is.
            contentType: signature.type,
            uploadedBy: req.user?._id,
        });

        res.status(201).json({ url: `/api/images/${image._id}` });
    } catch (err) {
        console.error('[Image] upload failed:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getProductImage = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            res.status(400).json({ message: 'Invalid image id' });
            return;
        }

        const image = await ProductImage.findById(req.params.id).lean();
        if (!image) {
            res.status(404).json({ message: 'Rasm topilmadi' });
            return;
        }

        /*
         * An image's bytes never change — a new photo is a new document with a
         * new id — so it can be cached hard. Without this every catalogue view
         * would pull every photo out of the database again.
         */
        res.setHeader('Content-Type', (image as any).contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        // The stored bytes are only ever served, never interpreted as markup.
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Disposition', 'inline');
        res.send((image as any).data);
    } catch (err) {
        console.error('[Image] fetch failed:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
