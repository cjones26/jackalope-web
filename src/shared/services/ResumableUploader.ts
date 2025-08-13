// ResumableUploader - Client-side implementation for unified file uploads
//
// This uploader works with a backend that automatically chooses between:
// - Single-part uploads for files <5MB
// - Multipart uploads for files ≥5MB
//
// The backend handles S3 constraints and optimization, the client just
// follows the upload flow determined by the server.

export class ResumableUploader {
  private apiBaseUrl: string;
  private token: string;
  private chunkSize: number;

  constructor(
    apiBaseUrl: string,
    token: string,
    chunkSize: number = 10 * 1024 * 1024, // 10MB chunks for multipart uploads
  ) {
    this.apiBaseUrl = apiBaseUrl;
    this.token = token;
    this.chunkSize = Math.max(chunkSize, 5 * 1024 * 1024); // Ensure chunk size is at least 5MB for S3 multipart
  }

  async uploadFile(
    file: File,
    onProgress?: (progress: number) => void,
    onChunkComplete?: (chunkNumber: number, totalChunks: number) => void,
  ): Promise<{ success: boolean; uploadId?: string; error?: string }> {
    try {
      // Step 1: Initiate upload and let backend decide upload type
      const initResponse = await this.initiateUpload(file);
      if (!initResponse.success) {
        return { success: false, error: initResponse.error };
      }

      const { uploadId, uploadType, totalChunks } = initResponse;
      if (!uploadId) {
        return {
          success: false,
          error: 'Invalid upload initialization response',
        };
      }

      // Step 2: Route to appropriate upload method based on backend's decision
      if (uploadType === 'single') {
        return await this.uploadSinglePart(uploadId, file, onProgress);
      } else if (uploadType === 'multipart') {
        if (!totalChunks) {
          return {
            success: false,
            error: 'Missing totalChunks for multipart upload',
          };
        }
        return await this.uploadMultipart(
          uploadId,
          file,
          totalChunks,
          onProgress,
          onChunkComplete,
        );
      } else {
        return {
          success: false,
          error: `Unknown upload type: ${uploadType}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async uploadSinglePart(
    uploadId: string,
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<{ success: boolean; uploadId?: string; error?: string }> {
    try {
      // Step 1: Get presigned URL for single-part upload
      const urlResponse = await fetch(`${this.apiBaseUrl}/api/v1/uploads/url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          uploadId,
          partNumber: 1, // Single part
        }),
      });

      if (!urlResponse.ok) {
        const error = await urlResponse.json();
        await this.abortUpload(uploadId);
        return {
          success: false,
          error: error.error || 'Failed to get upload URL',
        };
      }

      const { uploadUrl } = await urlResponse.json();

      // Step 2: Upload file directly to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        await this.abortUpload(uploadId);
        return { success: false, error: 'Failed to upload file' };
      }

      // Step 3: Complete the upload
      const completeResult = await this.completeUpload(uploadId, []);
      if (!completeResult.success) {
        return { success: false, error: completeResult.error };
      }

      onProgress?.(100);
      return { success: true, uploadId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload error',
      };
    }
  }

  private async uploadMultipart(
    uploadId: string,
    file: File,
    totalChunks: number,
    onProgress?: (progress: number) => void,
    onChunkComplete?: (chunkNumber: number, totalChunks: number) => void,
  ): Promise<{ success: boolean; uploadId?: string; error?: string }> {
    try {
      const uploadedParts: { partNumber: number; etag: string }[] = [];

      // Upload each chunk
      for (let chunkNumber = 1; chunkNumber <= totalChunks; chunkNumber++) {
        const start = (chunkNumber - 1) * this.chunkSize;
        const end = Math.min(start + this.chunkSize, file.size);
        const chunk = file.slice(start, end);

        const chunkResult = await this.uploadChunk(
          uploadId,
          chunkNumber,
          chunk,
        );
        if (!chunkResult.success) {
          // Abort the upload on failure
          await this.abortUpload(uploadId);
          return { success: false, error: chunkResult.error };
        }

        uploadedParts.push({
          partNumber: chunkNumber,
          etag: chunkResult.etag!,
        });

        // Report progress
        const progress = (chunkNumber / totalChunks) * 100;
        onProgress?.(progress);
        onChunkComplete?.(chunkNumber, totalChunks);
      }

      // Complete the upload
      const completeResult = await this.completeUpload(uploadId, uploadedParts);
      if (!completeResult.success) {
        return { success: false, error: completeResult.error };
      }

      return { success: true, uploadId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async resumeUpload(
    file: File,
    uploadId: string,
    onProgress?: (progress: number) => void,
    onChunkComplete?: (chunkNumber: number, totalChunks: number) => void,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current upload status
      const status = await this.getUploadStatus(uploadId);
      if (!status.success) {
        return { success: false, error: status.error };
      }

      const { uploadedParts, totalParts } = status;
      if (!uploadedParts || !totalParts) {
        return { success: false, error: 'Invalid upload status response' };
      }

      const totalChunks = totalParts;
      const completeParts: { partNumber: number; etag: string }[] = [];

      // Find which parts are already uploaded
      const uploadedPartNumbers = new Set(
        uploadedParts.map((p) => p.partNumber),
      );

      // Upload missing chunks
      for (let chunkNumber = 1; chunkNumber <= totalChunks; chunkNumber++) {
        if (uploadedPartNumbers.has(chunkNumber)) {
          // Part already uploaded
          const existingPart = uploadedParts.find(
            (p) => p.partNumber === chunkNumber,
          );
          if (existingPart?.etag) {
            completeParts.push({
              partNumber: chunkNumber,
              etag: existingPart.etag,
            });
          }
          continue;
        }

        // Upload missing chunk
        const start = (chunkNumber - 1) * this.chunkSize;
        const end = Math.min(start + this.chunkSize, file.size);
        const chunk = file.slice(start, end);

        const chunkResult = await this.uploadChunk(
          uploadId,
          chunkNumber,
          chunk,
        );
        if (!chunkResult.success) {
          return { success: false, error: chunkResult.error };
        }

        completeParts.push({
          partNumber: chunkNumber,
          etag: chunkResult.etag!,
        });

        // Report progress
        const progress = (completeParts.length / totalChunks) * 100;
        onProgress?.(progress);
        onChunkComplete?.(chunkNumber, totalChunks);
      }

      // Complete the upload
      const completeResult = await this.completeUpload(uploadId, completeParts);
      return completeResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async initiateUpload(file: File): Promise<{
    success: boolean;
    uploadId?: string;
    uploadType?: 'single' | 'multipart';
    totalChunks?: number;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/v1/uploads/initiate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            totalSize: file.size,
            chunkSize: this.chunkSize,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error || 'Failed to initiate upload',
        };
      }

      const data = await response.json();
      return {
        success: true,
        uploadId: data.uploadId,
        uploadType: data.uploadType,
        totalChunks: data.totalChunks,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  private async uploadChunk(
    uploadId: string,
    partNumber: number,
    chunk: Blob,
  ): Promise<{ success: boolean; etag?: string; error?: string }> {
    try {
      // Get presigned URL
      const urlResponse = await fetch(`${this.apiBaseUrl}/api/v1/uploads/url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          uploadId,
          partNumber,
        }),
      });

      if (!urlResponse.ok) {
        const error = await urlResponse.json();
        return {
          success: false,
          error: error.error || 'Failed to get upload URL',
        };
      }

      const { uploadUrl } = await urlResponse.json();

      // Upload chunk to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: chunk,
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      });

      if (!uploadResponse.ok) {
        return { success: false, error: 'Failed to upload chunk to S3' };
      }

      const etag = uploadResponse.headers.get('ETag')?.replace(/"/g, '');
      if (!etag) {
        return { success: false, error: 'No ETag returned from S3' };
      }

      // Confirm chunk upload
      const confirmResponse = await fetch(
        `${this.apiBaseUrl}/api/v1/uploads/complete-part`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({
            uploadId,
            partNumber,
            etag,
            size: chunk.size,
          }),
        },
      );

      if (!confirmResponse.ok) {
        const error = await confirmResponse.json();
        return {
          success: false,
          error: error.error || 'Failed to confirm chunk upload',
        };
      }

      return { success: true, etag };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Chunk upload error',
      };
    }
  }

  private async completeUpload(
    uploadId: string,
    parts: { partNumber: number; etag: string }[],
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/v1/uploads/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({
            uploadId,
            parts: parts.sort((a, b) => a.partNumber - b.partNumber),
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error || 'Failed to complete upload',
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Complete upload error',
      };
    }
  }

  private async abortUpload(uploadId: string): Promise<void> {
    try {
      await fetch(`${this.apiBaseUrl}/api/v1/uploads/abort`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ uploadId }),
      });
    } catch (error) {
      console.error('Failed to abort upload:', error);
    }
  }

  private async getUploadStatus(uploadId: string): Promise<{
    success: boolean;
    uploadedParts?: { partNumber: number; etag: string }[];
    totalParts?: number;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/v1/uploads/status?uploadId=${uploadId}`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error || 'Failed to get upload status',
        };
      }

      const data = await response.json();
      return {
        success: true,
        uploadedParts: data.uploadedParts,
        totalParts: data.totalParts,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Status check error',
      };
    }
  }
}
