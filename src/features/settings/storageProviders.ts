export interface StorageProvider {
  id: string;
  name: string;
  endpointUrl: string;
  defaultRegion: string;
  forcePathStyle: boolean;
  description: string;
  icon?: string;
}

export const STORAGE_PROVIDERS: StorageProvider[] = [
  {
    id: 'aws',
    name: 'AWS S3',
    endpointUrl: 'https://s3.amazonaws.com',
    defaultRegion: 'us-east-1',
    forcePathStyle: false,
    description: 'Amazon S3 cloud storage',
    icon: 'Cloud',
  },
  {
    id: 'localstack',
    name: 'LocalStack',
    endpointUrl: 'http://localhost:4566',
    defaultRegion: 'us-east-1',
    forcePathStyle: true,
    description: 'Local AWS cloud stack for development',
    icon: 'Laptop',
  },
  {
    id: 'minio',
    name: 'MinIO',
    endpointUrl: 'http://localhost:9000',
    defaultRegion: 'us-east-1',
    forcePathStyle: true,
    description: 'Self-hosted S3-compatible storage',
    icon: 'Server',
  },
  {
    id: 'backblaze',
    name: 'Backblaze B2',
    endpointUrl: 'https://s3.us-west-000.backblazeb2.com',
    defaultRegion: 'us-west-000',
    forcePathStyle: false,
    description: 'Backblaze B2 cloud storage',
    icon: 'Database',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare R2',
    endpointUrl: 'https://<account-id>.r2.cloudflarestorage.com',
    defaultRegion: 'auto',
    forcePathStyle: false,
    description: 'Cloudflare R2 storage',
    icon: 'Cloud',
  },
  {
    id: 'custom',
    name: 'Custom S3 Provider',
    endpointUrl: '',
    defaultRegion: '',
    forcePathStyle: false,
    description: 'Configure manually for any S3-compatible provider',
    icon: 'Settings',
  },
];

export function getProviderById(id: string): StorageProvider | undefined {
  return STORAGE_PROVIDERS.find((provider) => provider.id === id);
}
