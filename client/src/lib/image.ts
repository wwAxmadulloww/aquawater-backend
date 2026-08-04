/**
 * Preparing a photo from the shopkeeper's own camera roll for upload.
 *
 * A phone photo is several megabytes and four thousand pixels wide, which is
 * far more than a product card ever shows and more than is sensible to keep in
 * the database. Shrinking happens here, in the browser, so what crosses the
 * network is already the size it needs to be — and the server needs no image
 * library of its own to make that true.
 */

/** Longest edge of the stored image. Well above any size the site displays. */
const MAX_EDGE = 1200;

/** Anything larger than this is re-encoded as JPEG even if it arrived as PNG. */
const PNG_BUDGET = 400 * 1024;

export class NotAnImageError extends Error {}

/**
 * Loads a file into something canvas can draw.
 *
 * `createImageBitmap` is the direct route; the ObjectURL fallback covers older
 * Safari, which is not a rare browser among people running a shop from a phone.
 */
async function decode(file: File): Promise<{ width: number; height: number; source: CanvasImageSource }> {
    if (typeof createImageBitmap === 'function') {
        try {
            const bitmap = await createImageBitmap(file)
            return { width: bitmap.width, height: bitmap.height, source: bitmap }
        } catch {
            // Falls through: some browsers refuse formats they can still render
            // in an <img>, HEIC among them.
        }
    }

    const url = URL.createObjectURL(file)
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image()
            el.onload = () => resolve(el)
            el.onerror = () => reject(new NotAnImageError('decode failed'))
            el.src = url
        })
        return { width: img.naturalWidth, height: img.naturalHeight, source: img }
    } finally {
        URL.revokeObjectURL(url)
    }
}

/**
 * Returns the photo scaled down and re-encoded, ready to send.
 *
 * Throws NotAnImageError when the file is not a picture at all, so the caller
 * can say so plainly rather than uploading something the server will reject.
 */
export async function shrinkImage(file: File): Promise<Blob> {
    if (!file.type.startsWith('image/')) throw new NotAnImageError(file.type || 'unknown')

    const { width, height, source } = await decode(file)
    if (!width || !height) throw new NotAnImageError('empty image')

    const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new NotAnImageError('canvas unavailable')

    /*
     * A transparent PNG drawn straight to JPEG comes out with black behind it,
     * which on a dark product card looks like a hole. White is what a product
     * photo is shot against anyway.
     */
    const keepPng = file.type === 'image/png' && file.size <= PNG_BUDGET
    if (!keepPng) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, keepPng ? 'image/png' : 'image/jpeg', 0.85),
    )
    if (!blob) throw new NotAnImageError('encode failed')
    return blob
}
