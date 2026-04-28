import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

export function ProjectFilesSection({ bidId }: { bidId: number }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const utils = trpc.useUtils();
  const [isUploading, setIsUploading] = useState(false);
  const { data: files = [], isLoading } = trpc.bids.files.list.useQuery({ bidId });
  const uploadMutation = trpc.bids.files.upload.useMutation();

  const handleFilesSelected = async (selectedFiles: FileList | null) => {
    const filesToUpload = Array.from(selectedFiles ?? []);
    if (filesToUpload.length === 0) return;

    try {
      setIsUploading(true);
      for (const file of filesToUpload) {
        const dataBase64 = await readFileAsBase64(file);
        await uploadMutation.mutateAsync({
          bidId,
          originalName: file.name,
          mimeType: file.type || null,
          dataBase64,
        });
      }
      await utils.bids.files.list.invalidate({ bidId });
      toast.success("Project files uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload project files");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Files</CardTitle>
        <CardDescription>Upload plans, PDFs, and photos for internal project reference.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,image/*,application/pdf"
            className="hidden"
            onChange={(event) => handleFilesSelected(event.target.files)}
          />
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={isUploading}>
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
            Upload Files
          </Button>
          <span className="text-sm text-muted-foreground">Plans, PDFs, and photos. Stored locally for now.</span>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading files...</div>
        ) : files.length > 0 ? (
          <div className="divide-y rounded-md border">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{file.originalName}</div>
                  <div className="text-xs text-muted-foreground">{file.mimeType || "Unknown type"}</div>
                </div>
                <div className="text-xs text-muted-foreground">{formatFileSize(file.sizeBytes)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            No project files uploaded yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
