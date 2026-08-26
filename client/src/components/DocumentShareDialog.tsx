import { useEffect, useState } from "react";
import { Check, Copy, Link2, Loader2, RotateCcw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type ShareDuration = 24 | 72 | 168 | 720;
const durationLabels: Record<ShareDuration, string> = { 24: "24 hours", 72: "3 days", 168: "7 days", 720: "30 days" };

export function DocumentShareDialog({ document, open, onOpenChange }: { document: any | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [durationHours, setDurationHours] = useState<ShareDuration>(168);
  const [shareUrl, setShareUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const existingUrl = document?.shareToken ? `${window.location.origin}/share/doc/${document.shareToken}` : "";
    setShareUrl(existingUrl);
    setExpiresAt(document?.shareExpiresAt ? new Date(document.shareExpiresAt) : null);
    setCopied(false);
  }, [document?.id]);
  const createShareLink = trpc.documents.createShareLink.useMutation({
    onSuccess: (result) => { setShareUrl(result.shareUrl); setExpiresAt(result.expiresAt); setCopied(false); },
    onError: (error) => toast.error(error.message),
  });
  const revokeShareLink = trpc.documents.revokeShareLink.useMutation({
    onSuccess: () => { setShareUrl(""); setExpiresAt(null); toast.success("Share link revoked"); },
    onError: (error) => toast.error(error.message),
  });

  const generate = () => {
    if (!document) return;
    createShareLink.mutate({ id: document.id, durationHours, origin: window.location.origin });
  };
  const copy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Share link copied");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Share document</DialogTitle><DialogDescription>Create a public link for <strong>{document?.name}</strong>. The link stops working automatically when it expires.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Link expiration</Label><Select value={String(durationHours)} onValueChange={(value) => setDurationHours(Number(value) as ShareDuration)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(durationLabels) as unknown as ShareDuration[]).map(hours => <SelectItem key={hours} value={String(hours)}>{durationLabels[hours]}</SelectItem>)}</SelectContent></Select></div>
          {shareUrl && <div className="rounded-lg border border-border bg-muted/40 p-3"><p className="break-all text-xs text-muted-foreground">{shareUrl}</p><p className="mt-2 text-xs font-medium text-foreground">Expires {expiresAt?.toLocaleString()}</p></div>}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          {shareUrl && <Button type="button" variant="outline" onClick={() => document && revokeShareLink.mutate({ id: document.id })} disabled={revokeShareLink.isPending}><RotateCcw className="mr-2 h-4 w-4" />Revoke</Button>}
          {shareUrl ? <Button type="button" onClick={copy} className="bg-brand text-white hover:bg-brand-dark">{copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}{copied ? "Copied" : "Copy link"}</Button> : <Button type="button" onClick={generate} disabled={createShareLink.isPending} className="bg-brand text-white hover:bg-brand-dark">{createShareLink.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}Create share link</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
