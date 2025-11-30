import { UseMutationResult } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HardDrive,
  Lock,
  Settings2,
  Cloud,
  Laptop,
  Server,
  Database,
  Trash2,
  Save,
  Shield,
  Globe,
  Zap,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/Alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/AlertDialog';
import { Button } from '@/shared/ui/Button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/Card';
import { Form, FormField, FormInput } from '@/shared/ui/Form';
import { Label } from '@/shared/ui/Label';
import { STORAGE_PROVIDERS, StorageProvider } from './storageProviders';

const storageConfigSchema = z.object({
  endpointUrl: z.string().url('Valid endpoint URL is required'),
  region: z.string().min(1, 'Region is required'),
  bucketName: z.string().min(1, 'Bucket name is required').max(255),
  accessKeyId: z.string().min(1, 'Access key ID is required'),
  secretAccessKey: z.string().min(1, 'Secret access key is required'),
  forcePathStyle: z.boolean(),
});

type StorageConfigFormData = z.infer<typeof storageConfigSchema>;

interface StorageConfig {
  id: string;
  endpoint_url: string;
  region: string;
  bucket_name: string;
  force_path_style: boolean;
  created_at?: string;
  updated_at?: string;
}

interface StorageConfigCardProps {
  storageConfig: StorageConfig | null | undefined;
  onSubmit: (data: StorageConfigFormData) => void;
  onClear: () => void;
  mutation: UseMutationResult<any, Error, any, unknown>;
  clearMutation: UseMutationResult<any, Error, any, unknown>;
}

export function StorageConfigCard({
  storageConfig,
  onSubmit,
  onClear,
  mutation,
  clearMutation,
}: StorageConfigCardProps) {
  const [successMessage, setSuccessMessage] = useState('');
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] =
    useState<StorageProvider | null>(null);

  const hasStorageConfig = !!storageConfig;

  const form = useForm<StorageConfigFormData>({
    resolver: zodResolver(storageConfigSchema),
    defaultValues: {
      endpointUrl: storageConfig?.endpoint_url || '',
      region: storageConfig?.region || '',
      bucketName: storageConfig?.bucket_name || '',
      accessKeyId: '',
      secretAccessKey: '',
      forcePathStyle: storageConfig?.force_path_style || false,
    },
  });

  const handleSubmit = (data: StorageConfigFormData) => {
    setSuccessMessage('');
    onSubmit(data);
    setSuccessMessage('Storage configuration saved successfully!');
  };

  const handleFormChange = () => {
    mutation.reset();
    setSuccessMessage('');
  };

  const handleProviderSelect = (provider: StorageProvider) => {
    setSelectedProvider(provider);
    if (provider.id !== 'custom') {
      form.setValue('endpointUrl', provider.endpointUrl);
      form.setValue('region', provider.defaultRegion);
      form.setValue('forcePathStyle', provider.forcePathStyle);
    }
  };

  const handleClearStorage = () => {
    setSuccessMessage('');
    onClear();
    setClearDialogOpen(false);
  };

  // Get the icon component for a provider
  const getProviderIcon = (
    iconName: string | undefined,
    className: string = 'h-5 w-5',
  ) => {
    const iconProps = { className };
    switch (iconName) {
      case 'Cloud':
        return <Cloud {...iconProps} />;
      case 'Laptop':
        return <Laptop {...iconProps} />;
      case 'Server':
        return <Server {...iconProps} />;
      case 'Database':
        return <Database {...iconProps} />;
      case 'Settings':
        return <Settings2 {...iconProps} />;
      default:
        return <HardDrive {...iconProps} />;
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <HardDrive className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl">S3-Compatible Storage</CardTitle>
            <CardDescription className="mt-1">
              {hasStorageConfig
                ? 'Your storage backend is configured and active'
                : 'Connect to AWS S3, MinIO, Backblaze, or any S3-compatible provider'}
            </CardDescription>
          </div>
        </div>
        <CardAction>
          {hasStorageConfig ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-semibold">Connected</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20">
              <XCircle className="h-4 w-4" />
              <span className="text-sm font-semibold">Not Connected</span>
            </div>
          )}
        </CardAction>
      </CardHeader>

      <CardContent className="p-8">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            onChange={handleFormChange}
            className="flex flex-col gap-8"
          >
            {/* Immutable Warning */}
            {hasStorageConfig && (
              <Alert
                variant="warning"
                className="border-l-4 border-l-amber-500"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <AlertTitle className="text-base font-semibold">
                      Configuration Locked
                    </AlertTitle>
                    <AlertDescription className="text-sm leading-relaxed">
                      Storage settings cannot be modified after configuration.
                      Clear the existing setup to reconfigure with different
                      credentials or provider.
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}

            {/* Provider Selection - Only show when not configured */}
            {!hasStorageConfig && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <Globe className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">
                      Choose Your Provider
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Select the storage service you want to connect
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {STORAGE_PROVIDERS.map((provider) => {
                    const isSelected = selectedProvider?.id === provider.id;
                    return (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => handleProviderSelect(provider)}
                        className={`group relative flex flex-col p-5 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-lg transition-colors ${
                              isSelected
                                ? 'bg-primary/10'
                                : 'bg-gray-100 dark:bg-gray-800'
                            }`}
                          >
                            {getProviderIcon(provider.icon, 'h-6 w-6')}
                          </div>
                          {isSelected && (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                              <CheckCircle2 className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                        <h4 className="font-semibold text-sm mb-1.5">
                          {provider.name}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {provider.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Connection Settings */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                  <Settings2 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">
                    Connection Details
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Configure your S3 endpoint and bucket
                  </p>
                </div>
              </div>

              <div className="space-y-5 bg-gray-50/50 dark:bg-gray-900/50 p-6 rounded-xl border">
                <div className="space-y-2.5">
                  <Label
                    htmlFor="endpointUrl"
                    className="text-sm font-semibold flex items-center gap-2"
                  >
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    Endpoint URL
                  </Label>
                  <FormField
                    control={form.control}
                    name="endpointUrl"
                    render={({ field }) => (
                      <FormInput
                        id="endpointUrl"
                        type="url"
                        placeholder="https://s3.amazonaws.com"
                        disabled={hasStorageConfig}
                        readOnly={hasStorageConfig}
                        className="h-11"
                        {...field}
                      />
                    )}
                  />
                  <p className="text-xs text-muted-foreground ml-6">
                    The S3-compatible endpoint URL for your storage provider
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2.5">
                    <Label
                      htmlFor="region"
                      className="text-sm font-semibold flex items-center gap-2"
                    >
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      Region
                    </Label>
                    <FormField
                      control={form.control}
                      name="region"
                      render={({ field }) => (
                        <FormInput
                          id="region"
                          placeholder="us-east-1"
                          disabled={hasStorageConfig}
                          readOnly={hasStorageConfig}
                          className="h-11"
                          {...field}
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label
                      htmlFor="bucketName"
                      className="text-sm font-semibold flex items-center gap-2"
                    >
                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                      Bucket Name
                    </Label>
                    <FormField
                      control={form.control}
                      name="bucketName"
                      render={({ field }) => (
                        <FormInput
                          id="bucketName"
                          placeholder="my-storage-bucket"
                          disabled={hasStorageConfig}
                          readOnly={hasStorageConfig}
                          className="h-11"
                          {...field}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Authentication */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                  <Shield className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">
                    Security Credentials
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your access keys are encrypted and stored securely
                  </p>
                </div>
              </div>

              <div className="space-y-5 bg-gray-50/50 dark:bg-gray-900/50 p-6 rounded-xl border">
                <div className="space-y-2.5">
                  <Label
                    htmlFor="accessKeyId"
                    className="text-sm font-semibold flex items-center gap-2"
                  >
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    Access Key ID
                  </Label>
                  <FormField
                    control={form.control}
                    name="accessKeyId"
                    render={({ field }) => (
                      <FormInput
                        id="accessKeyId"
                        type="password"
                        placeholder={
                          hasStorageConfig
                            ? '••••••••••••••••'
                            : 'Enter your access key ID'
                        }
                        disabled={hasStorageConfig}
                        readOnly={hasStorageConfig}
                        className="h-11 font-mono"
                        {...field}
                        value={
                          hasStorageConfig
                            ? '••••••••••••••••'
                            : field.value || ''
                        }
                      />
                    )}
                  />
                </div>

                <div className="space-y-2.5">
                  <Label
                    htmlFor="secretAccessKey"
                    className="text-sm font-semibold flex items-center gap-2"
                  >
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    Secret Access Key
                  </Label>
                  <FormField
                    control={form.control}
                    name="secretAccessKey"
                    render={({ field }) => (
                      <FormInput
                        id="secretAccessKey"
                        type="password"
                        placeholder={
                          hasStorageConfig
                            ? '••••••••••••••••'
                            : 'Enter your secret access key'
                        }
                        disabled={hasStorageConfig}
                        readOnly={hasStorageConfig}
                        className="h-11 font-mono"
                        {...field}
                        value={
                          hasStorageConfig
                            ? '••••••••••••••••'
                            : field.value || ''
                        }
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
                  <Settings2 className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">
                    Advanced Configuration
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Additional settings for compatibility
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 p-6 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50">
                <label className="flex items-start gap-4 cursor-pointer group">
                  <div className="flex items-center h-6">
                    <input
                      type="checkbox"
                      id="forcePathStyle"
                      {...form.register('forcePathStyle')}
                      className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary focus:ring-2 focus:ring-offset-2 transition-all"
                      disabled={hasStorageConfig}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="font-semibold text-sm group-hover:text-primary transition-colors">
                      Use Path-Style URLs
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Enable this option for MinIO, LocalStack, and other
                      S3-compatible providers that require path-style addressing
                      instead of virtual-hosted-style
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Status Messages */}
            {mutation.isError && (
              <Alert
                variant="destructive"
                className="border-l-4 border-l-red-500"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <AlertDescription className="text-sm">
                      There was an error saving your storage configuration.
                      Please verify your credentials and try again.
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}

            {successMessage && (
              <Alert className="border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <AlertDescription className="text-sm text-emerald-900 dark:text-emerald-100">
                      {successMessage}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center pt-6 border-t gap-4">
              {hasStorageConfig ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Configuration is locked. Clear to reconfigure.
                  </p>
                  <AlertDialog
                    open={clearDialogOpen}
                    onOpenChange={setClearDialogOpen}
                  >
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear Configuration
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-lg">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-3 text-lg">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                          </div>
                          Clear Storage Configuration?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4 pt-4">
                          <p className="font-medium text-foreground text-base">
                            This action will remove all file metadata from the
                            database.
                          </p>
                          <div className="space-y-3 rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
                            <div className="flex items-start gap-3">
                              <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">
                                All information about uploaded files, folders,
                                and shares will be permanently lost
                              </span>
                            </div>
                            <div className="flex items-start gap-3">
                              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">
                                Your actual files in the S3 bucket will remain
                                safe and untouched
                              </span>
                            </div>
                            <div className="flex items-start gap-3">
                              <Settings2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">
                                You can reconfigure storage settings immediately
                                after clearing
                              </span>
                            </div>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleClearStorage}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={clearMutation.isPending}
                        >
                          {clearMutation.isPending ? (
                            <>
                              <div className="h-4 w-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Clearing...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Yes, Clear Storage
                            </>
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {selectedProvider
                      ? `Connecting to ${selectedProvider.name}`
                      : 'Select a provider to continue'}
                  </p>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={mutation.isPending || !selectedProvider}
                    className="min-w-[200px] h-12 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                  >
                    {mutation.isPending ? (
                      <>
                        <div className="h-5 w-5 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5 mr-2" />
                        Connect Storage
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
