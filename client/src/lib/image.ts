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
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)

    /*
     * Transparency decides the format, not the file extension.
     *
     * A see-through PNG re-encoded as JPEG comes out with a solid block behind
     * it, which on a dark product card reads as a hole where the bottle should
     * be. Anything opaque goes to JPEG, which for a photograph is far smaller
     * than PNG at the same visible quality.
     */
    const transparent = hasAlpha(ctx, canvas.width, canvas.height)
    if (!transparent) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
    }

    const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, transparent ? 'image/png' : 'image/jpeg', 0.85),
    )
    if (!blob) throw new NotAnImageError('encode failed')

    /*
     * Never send more than arrived. Re-encoding a PNG that was already
     * optimised makes it bigger — a 161KB drawing came back out at 222KB — and
     * there is nothing to gain by storing the worse of the two when the photo
     * did not even need scaling down.
     */
    if (scale === 1 && blob.size >= file.size) return file
    return blob
}

/**
 * Whether any pixel is less than fully opaque.
 *
 * Sampled rather than exhaustive: a transparent image is transparent across
 * large areas, so every hundredth pixel finds it, and a full scan of a
 * 1200×1200 canvas is work done on every upload for no extra certainty.
 */
function hasAlpha(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
    let data: Uint8ClampedArray
    try {
        data = ctx.getImageData(0, 0, w, h).data
    } catch {
        // A cross-origin source taints the canvas. Assume opaque; the worst
        // case is a white background behind a picture that had none.
        return false
    }
    for (let i = 3; i < data.length; i += 4 * 100) {
        if (data[i] < 255) return true
    }
    return false
}
