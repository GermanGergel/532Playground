import React from 'react';
import { Button, Modal, useTranslation } from '../ui';
import { Camera, Upload } from '../icons';

// --- PHOTO SOURCE MODAL ---
interface PhotoSourceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (source: 'camera' | 'upload') => void;
}
export const PhotoSourceModal: React.FC<PhotoSourceModalProps> = ({ isOpen, onClose, onSelect }) => {
    const t = useTranslation();
    if (!isOpen) return null;
    return (
        <div 
            className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4"
            onClick={onClose}
        >
            <div 
                className="bg-dark-surface/90 backdrop-blur-xl rounded-2xl p-4 border border-white/10 w-full max-w-xs"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col gap-3">
                    <Button onClick={() => onSelect('camera')} variant="secondary" className="w-full !py-4 flex items-center justify-center gap-3 !text-lg">
                        <Camera className="w-6 h-6" /> {t.fromCamera}
                    </Button>
                    <Button onClick={() => onSelect('upload')} variant="secondary" className="w-full !py-4 flex items-center justify-center gap-3 !text-lg">
                        <Upload className="w-6 h-6" /> {t.fromGallery}
                    </Button>
                     <Button onClick={onClose} variant="secondary" className="w-full !py-3 mt-2">
                        {t.cancel}
                    </Button>
                </div>
            </div>
        </div>
    );
};

// --- CAMERA CAPTURE MODAL ---
interface CameraCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (imageDataUrl: string) => void;
}
export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({ isOpen, onClose, onCapture }) => {
    const t = useTranslation();
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const streamRef = React.useRef<MediaStream | null>(null);

    React.useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                alert("Could not access camera. Please check permissions.");
                onClose();
            }
        };

        const stopCamera = () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
        
        if (isOpen) {
            startCamera();
        }

        return () => {
            stopCamera();
        };
    }, [isOpen, onClose]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            if (context) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                onCapture(dataUrl);
                onClose();
            }
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t.capturePhoto}>
            <div className="relative">
                <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg bg-black"></video>
                <canvas ref={canvasRef} className="hidden"></canvas>
            </div>
            <Button onClick={handleCapture} className="w-full mt-4">{t.takePhoto}</Button>
        </Modal>
    );
};