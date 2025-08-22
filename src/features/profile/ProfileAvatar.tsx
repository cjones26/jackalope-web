import { useQueryClient } from '@tanstack/react-query';
import * as faceapi from 'face-api.js';
import { Camera, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import DefaultAvatar from '@/assets/default-avatar.jpg';
import { useSupabase } from '@/shared/context/supabase';
import { useApi } from '@/shared/hooks/useApi';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';

interface ProfileAvatarProps {
  avatarUrl: string | null;
  firstName?: string | null;
  lastName?: string | null;
  onAvatarChange?: (url: string | null) => void;
  className?: string;
}

export function ProfileAvatar({
  avatarUrl,
  firstName,
  lastName,
  onAvatarChange,
  className = 'h-24 w-24',
}: ProfileAvatarProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { user } = useSupabase();
  const { fetchWithAuth } = useApi();
  const queryClient = useQueryClient();

  // Load face detection models on component mount
  useEffect(() => {
    async function loadModels() {
      try {
        // Load models from jsDelivr CDN
        const modelPath =
          'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
        await faceapi.nets.tinyFaceDetector.loadFromUri(modelPath);
        await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
        setModelsLoaded(true);
      } catch (error) {
        console.error('Error loading face detection models:', error);
        // Still set as loaded so we can fall back to regular cropping
        setModelsLoaded(true);
      }
    }

    loadModels();

    // Clean up any preview URLs on unmount
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Upload image via backend API
  const uploadImage = async (file: File): Promise<string> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    const formData = new FormData();
    formData.append('file', file);

    const result = await fetchWithAuth('/api/v1/profile/avatar/upload', {
      method: 'POST',
      body: formData,
    });

    return result.data.url;
  };

  // Process and crop image with face detection
  const cropAndUpload = async (
    img: HTMLImageElement,
    startX: number,
    startY: number,
    width: number,
    height: number,
    fileExt: string,
  ) => {
    // Ensure values are valid
    startX = Math.max(0, startX);
    startY = Math.max(0, startY);
    width = Math.min(width, img.width - startX);
    height = Math.min(height, img.height - startY);

    // Draw to temporary canvas for cropping
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(
        img,
        startX,
        startY,
        width,
        height,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      // Create preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      canvas.toBlob(
        async (blob) => {
          if (blob) {
            const newPreviewUrl = URL.createObjectURL(blob);
            setPreviewUrl(newPreviewUrl);

            // Create File object for upload
            const file = new File([blob], `avatar.${fileExt}`, {
              type: `image/${fileExt}`,
            });

            try {
              // Upload the file directly to Supabase
              const uploadedUrl = await uploadImage(file);

              // Notify parent component of the new URL
              if (onAvatarChange) {
                onAvatarChange(uploadedUrl);
              }

              // Invalidate profile queries to refresh avatar everywhere
              queryClient.invalidateQueries({
                queryKey: ['user', user?.id],
              });
            } catch (error) {
              console.error('Upload error:', error);

              // Extract user-friendly error message
              let errorMessage = 'Failed to upload image';
              if (error && typeof error === 'object' && 'message' in error) {
                errorMessage = error.message as string;
              } else if (
                error &&
                typeof error === 'object' &&
                'statusText' in error
              ) {
                errorMessage = `Upload failed: ${error.statusText}`;
              }

              setUploadError(errorMessage);
            } finally {
              setIsUploading(false);
            }
          } else {
            setIsUploading(false);
            setUploadError('Failed to process image');
          }
        },
        `image/${fileExt}`,
        0.9,
      );
    } else {
      setIsUploading(false);
      setUploadError('Failed to create image');
    }
  };

  // Process image without face detection (center crop)
  const processImageWithoutFaceDetection = (
    img: HTMLImageElement,
    fileExt: string,
  ) => {
    // Default center crop
    const minSize = Math.min(img.width, img.height);
    const startX = (img.width - minSize) / 2;
    const startY = (img.height - minSize) / 2;

    cropAndUpload(img, startX, startY, minSize, minSize, fileExt);
  };

  // Detect face and crop around it
  const detectFaceAndCrop = async (img: HTMLImageElement, fileExt: string) => {
    try {
      if (!modelsLoaded) {
        processImageWithoutFaceDetection(img, fileExt);
        return;
      }

      // Detect faces in the image
      const detections = await faceapi
        .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      if (detections.length > 0) {
        // Get the first face detected
        const face = detections[0];
        const { box } = face.detection;

        // Calculate crop area with padding (fixed zoom of 1.5)
        const size = Math.max(box.width, box.height) * 1.5;
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        // Crop and create preview
        cropAndUpload(
          img,
          centerX - size / 2,
          centerY - size / 2,
          size,
          size,
          fileExt,
        );
      } else {
        // No face detected, crop center
        processImageWithoutFaceDetection(img, fileExt);
      }
    } catch (error) {
      console.error('Face detection error:', error);
      processImageWithoutFaceDetection(img, fileExt);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];

    // Validate file type on frontend
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError(
        `File type "${file.type}" is not supported. Please upload a JPEG, PNG, or WebP image.`,
      );
      e.target.value = ''; // Clear the input
      return;
    }

    // Validate file size on frontend (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      const fileSizeMB = Math.round((file.size / (1024 * 1024)) * 100) / 100;
      setUploadError(
        `File size (${fileSizeMB}MB) exceeds the 10MB limit. Please choose a smaller image.`,
      );
      e.target.value = ''; // Clear the input
      return;
    }

    // Clear any previous errors
    setUploadError(null);

    const tempUrl = URL.createObjectURL(file);
    setIsUploading(true);

    try {
      // Create a temporary image element to load the file
      const img = new Image();
      img.src = tempUrl;

      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Set the image reference for face detection
      if (imageRef.current) {
        imageRef.current.src = tempUrl;
        imageRef.current.onload = async () => {
          await detectFaceAndCrop(
            imageRef.current!,
            file.name.split('.').pop() || 'jpg',
          );
        };
      } else {
        // If image ref is not available, process without face detection
        processImageWithoutFaceDetection(
          img,
          file.name.split('.').pop() || 'jpg',
        );
      }
    } catch (error) {
      console.error('Error processing image:', error);
      setIsUploading(false);
      setUploadError('Error processing image');
      URL.revokeObjectURL(tempUrl);
    }

    // Clear the file input so the same file can be selected again
    e.target.value = '';
  };

  const handleRemoveAvatar = async () => {
    setIsUploading(true);
    setUploadError(null);

    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Clear preview if exists
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      // Delete avatar via backend API
      await fetchWithAuth('/api/v1/profile/avatar', {
        method: 'DELETE',
      });

      // Notify parent component
      if (onAvatarChange) {
        onAvatarChange(null);
      }

      // Invalidate queries to refresh avatar everywhere
      queryClient.invalidateQueries({ queryKey: ['user', user?.id] });
    } catch (error) {
      console.error('Error removing avatar:', error);
      setUploadError('Failed to remove avatar');
    } finally {
      setIsUploading(false);
    }
  };

  // Get initials for avatar fallback
  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return '';
  };

  const displayUrl = previewUrl || avatarUrl;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {/* Main avatar display */}
        <div
          className={`relative cursor-pointer group ${isUploading ? 'opacity-50' : ''}`}
          onClick={!isUploading ? handleAvatarClick : undefined}
        >
          <Avatar className={className}>
            {displayUrl ? (
              <AvatarImage src={displayUrl} alt="Profile" />
            ) : (
              <AvatarImage src={DefaultAvatar} alt="Default Profile" />
            )}
            {firstName && lastName && !displayUrl && (
              <AvatarFallback className="text-lg">
                {getInitials()}
              </AvatarFallback>
            )}
            <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </Avatar>

          {/* Processing spinner overlay */}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
              <Spinner className="h-8 w-8 text-white" />
            </div>
          )}
        </div>

        {/* Controls - show when we have an image */}
        {displayUrl && !isUploading && (
          <div className="absolute -bottom-3 -right-3">
            <Button
              size="sm"
              variant="destructive"
              className="rounded-full w-8 h-8 p-0 flex items-center justify-center"
              onClick={handleRemoveAvatar}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Error message */}
      {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

      {/* File input (hidden) */}
      <input
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {/* Hidden elements for processing */}
      <div className="hidden">
        <img ref={imageRef} alt="Processing" />
        <canvas ref={canvasRef} />
      </div>

      <div className="text-center pt-4">
        <span className="text-sm text-muted-foreground block">
          {!displayUrl
            ? 'Click to upload a profile photo'
            : 'Click to change profile photo'}
        </span>
        <span className="text-xs text-muted-foreground/70">
          Supports JPEG, PNG, and WebP images (max 10MB)
        </span>
      </div>
    </div>
  );
}
