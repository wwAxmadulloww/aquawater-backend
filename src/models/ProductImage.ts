import mongoose, { Document, Schema } from 'mongoose';

/**
 * A product photo, stored as bytes.
 *
 * The obvious place for an upload is a folder on disk, but this runs on Vercel
 * where the filesystem is read-only apart from a scratch directory that is
 * discarded when the function does — a photo written there would vanish before
 * the next request could serve it. An object store would work, but it is one
 * more account and one more set of credentials to keep alive for what amounts
 * to a handful of pictures.
 *
 * So the bytes live here. The client shrinks each photo before sending it, so
 * a document is tens of kilobytes against a 16MB ceiling, and the catalogue
 * itself never carries them: products hold a URL, and the image is fetched
 * separately and cached by the browser.
 */
export interface IProductImage extends Document {
    data: Buffer;
    contentType: string;
    /** Who uploaded it, for tracing an image back to a person. */
    uploadedBy?: mongoose.Types.ObjectId;
}

const ProductImageSchema = new Schema<IProductImage>(
    {
        data: { type: Buffer, required: true },
        contentType: { type: String, required: true },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true },
);

export default mongoose.model<IProductImage>('ProductImage', ProductImageSchema);
