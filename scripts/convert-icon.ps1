# Convert a Gemini pictogram (JPEG, white background) to a transparent #555555 PNG.
# Usage: convert-icons.ps1 -Src <in> -Dst <out.png>
param([string]$Src, [string]$Dst, [int]$Size = 512, [int]$Box = 432)

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class IconConv {
    public static string Run(string srcPath, string dstPath, int size, int box) {
        Rectangle bbox;
        Bitmap alpha;
        using (var src = new Bitmap(srcPath)) alpha = ToAlpha(src, out bbox);

        // Fit the shape bounding box into box x box (keep aspect) and center it in size x size
        double scale = Math.Min((double)box / bbox.Width, (double)box / bbox.Height);
        int w = (int)Math.Round(bbox.Width * scale), h = (int)Math.Round(bbox.Height * scale);
        using (alpha)
        using (var outBmp = new Bitmap(size, size, PixelFormat.Format32bppArgb)) {
            using (var g = Graphics.FromImage(outBmp)) {
                g.Clear(Color.Transparent);
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                g.CompositingMode = CompositingMode.SourceCopy;
                using (var attr = new ImageAttributes()) {
                    attr.SetWrapMode(WrapMode.TileFlipXY); // avoid edge bleeding
                    g.DrawImage(alpha, new Rectangle((size - w) / 2, (size - h) / 2, w, h),
                        bbox.X, bbox.Y, bbox.Width, bbox.Height, GraphicsUnit.Pixel, attr);
                }
            }
            outBmp.Save(dstPath, ImageFormat.Png);
        }
        return String.Format("bbox {0}x{1} at ({2},{3}) -> {4}x{5}", bbox.Width, bbox.Height, bbox.X, bbox.Y, w, h);
    }

    // Luminance to alpha: paper -> transparent, ink (#555) -> opaque. Color is fixed to #555555
    static Bitmap ToAlpha(Bitmap src, out Rectangle bbox) {
        int w = src.Width, h = src.Height;
        var rect = new Rectangle(0, 0, w, h);
        var sd = src.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        int stride = sd.Stride;
        var buf = new byte[stride * h];
        Marshal.Copy(sd.Scan0, buf, 0, buf.Length);
        src.UnlockBits(sd);

        const double ink = 85.0, paper = 235.0;
        int minX = w, minY = h, maxX = -1, maxY = -1;
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int i = y * stride + x * 4;
                double lum = 0.114 * buf[i] + 0.587 * buf[i + 1] + 0.299 * buf[i + 2];
                double a = (paper - lum) / (paper - ink);
                if (a < 0) a = 0; if (a > 1) a = 1;
                byte ab = (byte)Math.Round(a * 255);
                buf[i] = 0x55; buf[i + 1] = 0x55; buf[i + 2] = 0x55; buf[i + 3] = ab;
                if (ab > 128) {
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                }
            }
        }
        var dst = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        var dd = dst.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
        Marshal.Copy(buf, 0, dd.Scan0, buf.Length);
        dst.UnlockBits(dd);
        bbox = Rectangle.FromLTRB(minX, minY, maxX + 1, maxY + 1);
        return dst;
    }
}
"@

"{0}: {1}" -f (Split-Path $Dst -Leaf), [IconConv]::Run($Src, $Dst, $Size, $Box)
