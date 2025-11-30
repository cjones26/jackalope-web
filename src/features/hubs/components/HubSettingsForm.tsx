/**
 * Hub Settings Form
 * Allows hub admins to configure storage for their hub
 */

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Save,
  Loader2,
  HardDrive,
  Settings2,
  Globe,
  Lock,
  Shield,
  Zap,
  Cloud,
  Laptop,
  Server,
  Database,
  CheckCircle2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

import { useApi } from '@/shared/hooks/useApi';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/Card';

interface HubSettingsFormProps {
  hubId: string;
  hubName: string;
  isAdmin: boolean;
  storageConfig?: {
    id: string;
    name: string;
    provider_type: string;
    endpoint_url: string;
    region: string;
    bucket_name: string;
    force_path_style: boolean;
    is_active: boolean;
  } | null;
}

interface StorageConfigInput {
  name: string;
  providerType: string;
  endpointUrl: string;
  region: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

const STORAGE_PROVIDERS = [
  {
    id: 'aws',
    name: 'AWS S3',
    icon: 'cloud',
    endpoint: 'https://s3.amazonaws.com',
    region: 'us-east-1',
    pathStyle: false,
    description: 'Amazon S3 cloud storage',
  },
  {
    id: 'localstack',
    name: 'LocalStack',
    icon: 'laptop',
    endpoint: 'http://localhost:4566',
    region: 'us-east-1',
    pathStyle: true,
    description: 'Local AWS for development',
  },
  {
    id: 'minio',
    name: 'MinIO',
    icon: 'server',
    endpoint: 'http://localhost:9000',
    region: 'us-east-1',
    pathStyle: true,
    description: 'Self-hosted object storage',
  },
  {
    id: 'backblaze',
    name: 'Backblaze B2',
    icon: 'database',
    endpoint: 'https://s3.us-west-000.backblazeb2.com',
    region: 'us-west-000',
    pathStyle: false,
    description: 'Affordable cloud storage',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare R2',
    icon: 'cloud',
    endpoint: 'https://<account-id>.r2.cloudflarestorage.com',
    region: 'auto',
    pathStyle: false,
    description: 'Zero egress fees',
  },
  {
    id: 'custom',
    name: 'Custom Provider',
    icon: 'settings',
    endpoint: '',
    region: '',
    pathStyle: false,
    description: 'Any S3-compatible service',
  },
];

export function HubSettingsForm({
  hubId,
  hubName,
  isAdmin,
  storageConfig
}: HubSettingsFormProps) {
  const { fetchWithAuth } = useApi();
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(
    storageConfig?.provider_type || null
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState<StorageConfigInput>({
    name: `${hubName} Storage`, // Auto-generated
    providerType: storageConfig?.provider_type || '',
    endpointUrl: storageConfig?.endpoint_url || '',
    region: storageConfig?.region || '',
    bucketName: storageConfig?.bucket_name || '',
    accessKeyId: '',
    secretAccessKey: '',
    forcePathStyle: storageConfig?.force_path_style ?? true,
  });

  // Update form data when storageConfig changes (e.g., after saving)
  useEffect(() => {
    if (storageConfig) {
      setSelectedProvider(storageConfig.provider_type);
      setFormData({
        name: storageConfig.name,
        providerType: storageConfig.provider_type,
        endpointUrl: storageConfig.endpoint_url,
        region: storageConfig.region,
        bucketName: storageConfig.bucket_name,
        accessKeyId: '',
        secretAccessKey: '',
        forcePathStyle: storageConfig.force_path_style,
      });
    }
  }, [storageConfig]);

  const saveStorageConfigMutation = useMutation({
    mutationFn: async (data: StorageConfigInput) => {
      const response = await fetchWithAuth(`/api/v1/hubs/${hubId}/storage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          provider_type: data.providerType,
          endpoint_url: data.endpointUrl,
          region: data.region,
          bucket_name: data.bucketName,
          access_key_id: data.accessKeyId,
          secret_access_key: data.secretAccessKey,
          force_path_style: data.forcePathStyle,
        }),
      });
      return response;
    },
    onSuccess: () => {
      toast.success('Storage configuration saved successfully');
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['storage-health'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save storage configuration');
    },
  });

  const deleteStorageConfigMutation = useMutation({
    mutationFn: async () => {
      const response = await fetchWithAuth(`/api/v1/hubs/${hubId}/storage`, {
        method: 'DELETE',
      });
      return response;
    },
    onSuccess: () => {
      toast.success('Storage configuration deleted. All file metadata has been removed.');
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['storage-health'] });
      setShowDeleteConfirm(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete storage configuration');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.providerType) {
      toast.error('Please select a storage provider');
      return;
    }
    saveStorageConfigMutation.mutate(formData);
  };

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    const provider = STORAGE_PROVIDERS.find(p => p.id === providerId);
    if (provider) {
      if (provider.id === 'custom') {
        // Clear fields for custom provider
        setFormData(prev => ({
          ...prev,
          providerType: providerId,
          endpointUrl: '',
          region: '',
          bucketName: '',
          forcePathStyle: false,
        }));
      } else {
        // Pre-fill fields for known providers
        setFormData(prev => ({
          ...prev,
          providerType: providerId,
          endpointUrl: provider.endpoint,
          region: provider.region,
          forcePathStyle: provider.pathStyle,
        }));
      }
    }
  };

  const getProviderIcon = (iconName: string, className: string = 'h-5 w-5') => {
    const props = { className };
    switch (iconName) {
      case 'cloud': return <Cloud {...props} />;
      case 'laptop': return <Laptop {...props} />;
      case 'server': return <Server {...props} />;
      case 'database': return <Database {...props} />;
      case 'settings': return <Settings2 {...props} />;
      default: return <HardDrive {...props} />;
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center gap-4 p-6 rounded-xl bg-gray-50 dark:bg-gray-900 border">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-800">
              <Lock className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-base mb-1">Admin Access Required</h3>
              <p className="text-sm text-muted-foreground">
                Only hub administrators can configure storage settings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isConfigured = !!storageConfig;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Provider Selection - Only show when not configured */}
          {!isConfigured && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Globe className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Choose Your Provider</h3>
                  <p className="text-sm text-muted-foreground">Select the storage service you want to connect</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {STORAGE_PROVIDERS.map((provider) => {
                  const isSelected = selectedProvider === provider.id;
                  return (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => handleProviderSelect(provider.id)}
                      className={`group relative flex flex-col p-5 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-lg transition-colors ${
                          isSelected ? 'bg-primary/10' : 'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          {getProviderIcon(provider.icon, 'h-6 w-6')}
                        </div>
                        {isSelected && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                      <h4 className="font-semibold text-sm mb-1.5">{provider.name}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {provider.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Immutable Configuration Notice - Show when configured */}
          {isConfigured && (
            <div className="flex items-start gap-4 p-5 rounded-lg bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-800/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30 flex-shrink-0">
                <Lock className="h-5 w-5 text-amber-600 dark:text-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1.5 text-amber-900 dark:text-amber-200">
                  Storage Configuration Locked
                </h3>
                <p className="text-sm text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                  Storage configuration is immutable once saved. Settings cannot be changed to ensure data integrity.
                </p>
                {selectedProvider && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      Provider:
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100/80 dark:bg-amber-900/40 text-xs font-medium text-amber-800 dark:text-amber-300">
                      {getProviderIcon(STORAGE_PROVIDERS.find(p => p.id === selectedProvider)?.icon || 'server', 'h-3.5 w-3.5')}
                      {STORAGE_PROVIDERS.find(p => p.id === selectedProvider)?.name || selectedProvider}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Connection Details */}
          <div className="space-y-5 bg-gray-50/50 dark:bg-gray-900/50 p-6 rounded-xl border">
              <div className="space-y-2.5">
                <Label htmlFor="endpointUrl" className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Endpoint URL
                </Label>
                <Input
                  id="endpointUrl"
                  type="url"
                  value={formData.endpointUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, endpointUrl: e.target.value }))}
                  placeholder="https://s3.amazonaws.com"
                  disabled={isConfigured}
                  className="h-11"
                  required
                />
                <p className="text-xs text-muted-foreground ml-6">
                  S3-compatible storage endpoint (e.g., AWS S3, MinIO, Cloudflare R2)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2.5">
                  <Label htmlFor="region" className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    Region
                  </Label>
                  <Input
                    id="region"
                    value={formData.region}
                    onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
                    placeholder="us-east-1"
                    disabled={isConfigured}
                    className="h-11"
                    required
                  />
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="bucketName" className="text-sm font-semibold flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    Bucket Name
                  </Label>
                  <Input
                    id="bucketName"
                    value={formData.bucketName}
                    onChange={(e) => setFormData(prev => ({ ...prev, bucketName: e.target.value }))}
                    placeholder="my-bucket"
                    disabled={isConfigured}
                    className="h-11"
                    required
                  />
                </div>
              </div>
            </div>

          {/* Security Credentials */}
          <div className="space-y-5 bg-gray-50/50 dark:bg-gray-900/50 p-6 rounded-xl border">
              <div className="space-y-2.5">
                <Label htmlFor="accessKeyId" className="text-sm font-semibold flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Access Key ID
                </Label>
                <Input
                  id="accessKeyId"
                  type="password"
                  value={formData.accessKeyId}
                  onChange={(e) => setFormData(prev => ({ ...prev, accessKeyId: e.target.value }))}
                  placeholder={isConfigured ? '••••••••' : 'Enter access key ID'}
                  disabled={isConfigured}
                  className="h-11 font-mono"
                  required={!isConfigured}
                />
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="secretAccessKey" className="text-sm font-semibold flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Secret Access Key
                </Label>
                <Input
                  id="secretAccessKey"
                  type="password"
                  value={formData.secretAccessKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, secretAccessKey: e.target.value }))}
                  placeholder={isConfigured ? '••••••••' : 'Enter secret access key'}
                  disabled={isConfigured}
                  className="h-11 font-mono"
                  required={!isConfigured}
                />
              </div>
            </div>

          {/* Advanced Options */}
          <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 p-6 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50">
              <label className="flex items-start gap-4 cursor-pointer group">
                <div className="flex items-center h-6">
                  <input
                    id="forcePathStyle"
                    type="checkbox"
                    checked={formData.forcePathStyle}
                    onChange={(e) => setFormData(prev => ({ ...prev, forcePathStyle: e.target.checked }))}
                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary focus:ring-2 focus:ring-offset-2 transition-all"
                    disabled={isConfigured}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="font-semibold text-sm group-hover:text-primary transition-colors">
                    Use Path-Style URLs
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Required for MinIO and some S3 providers that use path-style addressing
                  </p>
                </div>
              </label>
            </div>

          {/* Submit Button */}
          {!isConfigured && (
            <div className="flex justify-end pt-6 border-t">
              <Button
                type="submit"
                disabled={saveStorageConfigMutation.isPending}
              >
                {saveStorageConfigMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Delete Button - Show when configured */}
          {isConfigured && (
            <div className="pt-6 border-t">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full sm:w-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Storage Configuration
              </Button>
            </div>
          )}
        </form>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Delete Storage Configuration?</h3>
                  <p className="text-sm text-muted-foreground">
                    This action cannot be undone. This will permanently delete:
                  </p>
                </div>
              </div>

              <ul className="space-y-2 mb-6 ml-16 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-red-600 dark:text-red-500">•</span>
                  <span>All file metadata and upload records in the database</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 dark:text-red-500">•</span>
                  <span>All folder structures and organization</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 dark:text-red-500">•</span>
                  <span>The storage configuration itself</span>
                </li>
              </ul>

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-lg p-3 mb-6">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <strong>Note:</strong> Files will remain in your storage bucket and must be manually deleted if needed.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteStorageConfigMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => deleteStorageConfigMutation.mutate()}
                  disabled={deleteStorageConfigMutation.isPending}
                >
                  {deleteStorageConfigMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Configuration
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
