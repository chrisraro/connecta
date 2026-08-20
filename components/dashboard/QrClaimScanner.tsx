"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * In-app camera QR scanner for card activation.
 *
 * Exists because the "scan with your phone camera" path has a signup wall:
 * the QR resolves to /t/<uuid>, which routes through Clerk and onboarding.
 * For a user who is ALREADY signed in and sitting on the cards page, that
 * round-trip is pointless — scanning here claims the card directly.
 *
 * Decoding strategy: native BarcodeDetector where it exists (Chrome/Android
 * — the same devices that have NFC and are the primary audience), falling
 * back to jsQR on a canvas readback everywhere else (iOS Safari < 17,
 * Firefox). jsQR is imported lazily so the ~40KB decoder is only fetched
 * when someone actually opens the camera.
 *
 * Accepts either payload shape:
 *  - a /t/<uuid> URL from any host — cards in circulation carry three
 *    generations of host after two brand renames, so the host is
 *    deliberately ignored and only the path shape is trusted
 *  - a bare 6-char activation code, in case codes are ever QR-encoded
 */

// Minimal typing for the (still experimental) native detector.
interface DetectedBarcode {
    rawValue: string;
}
interface BarcodeDetectorLike {
    detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
declare global {
    interface Window {
        BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike;
    }
}

export type QrScanResult =
    | { kind: "uuid"; uuid: string }
    | { kind: "code"; code: string };

/** Parse a decoded QR payload into a claimable identity, or null. */
export function parseQrPayload(raw: string): QrScanResult | null {
    const text = raw.trim();
    // /t/<uuid> URL from any host — three generations of deployment host
    // are on shipped cards, so only the path shape is trusted. uuid charset:
    // NFC serials are hex-and-colons; manual registrations are free-form.
    const urlMatch = text.match(/\/t\/([A-Za-z0-9:%._-]+)(?:[?#]|$)/);
    if (urlMatch) {
        try {
            return { kind: "uuid", uuid: decodeURIComponent(urlMatch[1]) };
        } catch {
            return { kind: "uuid", uuid: urlMatch[1] };
        }
    }
    if (/^[A-Za-z0-9]{6}$/.test(text)) {
        return { kind: "code", code: text.toUpperCase() };
    }
    return null;
}

export function QrClaimScanner({
    onResult,
    disabled,
}: {
    /** Called once per successful decode; scanning stops before the call. */
    onResult: (result: QrScanResult) => void;
    disabled?: boolean;
}) {
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number | null>(null);
    const stoppedRef = useRef(false);

    const stop = useCallback(() => {
        stoppedRef.current = true;
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setScanning(false);
    }, []);

    // Never leave the camera light on after unmount or dialog close.
    useEffect(() => stop, [stop]);

    const start = useCallback(async () => {
        setError(null);
        if (!navigator.mediaDevices?.getUserMedia) {
            setError("Camera access is not supported in this browser.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
                audio: false,
            });
            streamRef.current = stream;
            stoppedRef.current = false;
            setScanning(true);
        } catch {
            setError(
                "Camera permission was denied. Allow camera access for this site, or type the activation code instead."
            );
        }
    }, []);

    // Attach the stream and run the decode loop once the <video> is mounted.
    useEffect(() => {
        if (!scanning || !streamRef.current || !videoRef.current) return;
        const video = videoRef.current;
        video.srcObject = streamRef.current;
        video.play().catch(() => {});

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const native = window.BarcodeDetector
            ? new window.BarcodeDetector({ formats: ["qr_code"] })
            : null;
        let jsqr: ((d: Uint8ClampedArray, w: number, h: number) => { data: string } | null) | null =
            null;

        const finish = (raw: string) => {
            const parsed = parseQrPayload(raw);
            if (!parsed) return false; // unrelated QR — keep scanning
            stop();
            onResult(parsed);
            return true;
        };

        const tick = async () => {
            if (stoppedRef.current) return;
            if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                try {
                    if (native) {
                        const codes = await native.detect(video);
                        if (codes.length && finish(codes[0].rawValue)) return;
                    } else {
                        if (!jsqr) {
                            jsqr = (await import("jsqr")).default;
                        }
                        if (ctx && video.videoWidth) {
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                            ctx.drawImage(video, 0, 0);
                            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            const hit = jsqr(img.data, img.width, img.height);
                            if (hit && finish(hit.data)) return;
                        }
                    }
                } catch {
                    // A single failed detect frame is not an error state.
                }
            }
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);

        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, [scanning, onResult, stop]);

    if (!scanning) {
        return (
            <div className="flex flex-col items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={start}
                    disabled={disabled}
                    className="w-full h-11 rounded-xl font-bold"
                >
                    <Camera className="w-4 h-4 mr-2" aria-hidden="true" />
                    Scan QR with camera
                </Button>
                {error && (
                    <p role="alert" className="text-xs text-red-600 text-center">
                        {error}
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-black">
                {/* Mirrorless: rear camera feed reads correctly un-flipped */}
                <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full aspect-square object-cover"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 flex items-center justify-center"
                >
                    <div className="w-3/5 aspect-square rounded-2xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                </div>
                <div className="absolute bottom-2 inset-x-0 flex justify-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[11px] font-bold text-white">
                        <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                        Point at the QR on your card
                    </span>
                </div>
            </div>
            <Button
                type="button"
                variant="ghost"
                onClick={stop}
                className="h-10 rounded-xl text-muted-foreground font-bold"
            >
                <CameraOff className="w-4 h-4 mr-2" aria-hidden="true" />
                Stop camera
            </Button>
        </div>
    );
}
