import { SignInButton } from "@/components/InternetIdentity";
import { FileBrowser } from "@/components/files/FileBrowser";
import { useWorkspaceIdentity } from "@/hooks/useWorkspace";
import { FolderOpen } from "lucide-react";

/**
 * Files — the workspace file browser. Local Files is backed by the platform
 * object-storage extension and the backend files API; ICP Cloud is presented
 * as not yet available rather than pretending to work.
 *
 * File operations are scoped to the signed-in principal, so a signed-out
 * visitor sees a clear prompt instead of an empty browser.
 */
export default function FilesPage() {
  const workspace = useWorkspaceIdentity();

  if (!workspace) {
    return (
      <section data-ocid="files.page" className="space-y-6">
        <header className="space-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Files
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Upload, organise and preview the files in your private workspace.
          </p>
        </header>

        <div
          data-ocid="files.signed_out_state"
          className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-16 text-center shadow-subtle"
        >
          <span className="app-tile flex h-14 w-14 items-center justify-center bg-gradient-to-br from-primary to-accent text-white">
            <FolderOpen className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="font-display text-lg font-semibold text-foreground">
            Sign in to open your files
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Your files are private to your Internet Identity. Sign in to upload
            and organise them.
          </p>
          <SignInButton className="rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-smooth hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" />
        </div>
      </section>
    );
  }

  return <FileBrowser />;
}
