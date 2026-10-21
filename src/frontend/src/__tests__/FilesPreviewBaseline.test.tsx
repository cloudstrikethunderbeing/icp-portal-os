import { renderWithActor } from "@/__tests__/test-utils";
import {
  type FileEntry,
  type FileRef,
  type Folder,
  type ListingItem,
  StorageSection,
  type backendInterface,
} from "@/backend";
import { FilePreviewDialog } from "@/components/files/FilePreviewDialog";
import FilesPage from "@/pages/FilesPage";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * Characterization baseline for the Files preview surface that the accepted
 * request must preserve:
 *  - the preview dialog renders an inline preview for image, PDF, text, JSON and
 *    CSV, and the metadata fallback card for an unsupported type
 *  - the fallback card still offers a download action
 *  - a stored file and folder still list and open from the browser
 *
 * The intentional changes (size limit, image compression, fit-to-view/full-size
 * controls, clearer loading/failure states) are NOT asserted here. The actor is
 * a typed local fake; no real canister or object storage is involved.
 */

const NOW = 1_700_000_000_000_000_000n;

/** A minimal stand-in for the object-storage ExternalBlob the app reads. */
function fakeBlob(bytes: Uint8Array, directUrl = "blob:preview") {
  return {
    getDirectURL: () => directUrl,
    getBytes: async () => bytes,
  } as unknown as FileRef["blob"];
}

function fileEntry(
  id: bigint,
  name: string,
  mimeType: string | undefined,
  bytes: Uint8Array,
): FileEntry {
  return {
    id,
    name,
    createdAt: NOW,
    updatedAt: NOW,
    section: StorageSection.local,
    ref: {
      blob: fakeBlob(bytes),
      filename: name,
      mimeType,
      sizeBytes: BigInt(bytes.length),
    },
  };
}

function makeActor(initial: ListingItem[] = []) {
  const items = [...initial];
  // The fake blob carries functions, so `structuredClone` cannot copy it; a
  // shallow copy of each item keeps the blob reference while avoiding aliasing
  // the array the test mutates.
  const listing = (): ListingItem[] =>
    items.map((item) =>
      item.__kind__ === "file"
        ? { __kind__: "file", file: { ...item.file } }
        : { __kind__: "folder", folder: { ...item.folder } },
    );

  const sortFolder = vi.fn<backendInterface["sortFolder"]>(async () =>
    listing(),
  );
  const listFolder = vi.fn<backendInterface["listFolder"]>(async () =>
    listing(),
  );
  const searchFiles = vi.fn<backendInterface["searchFiles"]>(async () =>
    listing(),
  );
  const actor = {
    sortFolder,
    listFolder,
    searchFiles,
  } satisfies Pick<
    backendInterface,
    "sortFolder" | "listFolder" | "searchFiles"
  >;

  return { actor };
}

describe("File preview baseline", () => {
  it("renders an inline image preview", async () => {
    const file = fileEntry(0n, "photo.png", "image/png", new Uint8Array([1]));
    renderWithActor(
      <FilePreviewDialog
        file={file}
        open
        onOpenChange={() => undefined}
        onDownload={() => undefined}
      />,
      makeActor().actor,
    );

    const image = await screen.findByRole("img", { name: "photo.png" });
    expect(image).toHaveAttribute("src", "blob:preview");
  });

  it("renders a PDF preview in an iframe", async () => {
    const file = fileEntry(0n, "doc.pdf", "application/pdf", new Uint8Array());
    renderWithActor(
      <FilePreviewDialog
        file={file}
        open
        onOpenChange={() => undefined}
        onDownload={() => undefined}
      />,
      makeActor().actor,
    );

    expect(await screen.findByTitle("Preview of doc.pdf")).toBeInTheDocument();
  });

  it("renders a text preview from the file bytes", async () => {
    const bytes = new TextEncoder().encode("hello from a text file");
    const file = fileEntry(0n, "readme.txt", "text/plain", bytes);
    renderWithActor(
      <FilePreviewDialog
        file={file}
        open
        onOpenChange={() => undefined}
        onDownload={() => undefined}
      />,
      makeActor().actor,
    );

    expect(
      await screen.findByText("hello from a text file"),
    ).toBeInTheDocument();
  });

  it("pretty-prints a JSON preview", async () => {
    const bytes = new TextEncoder().encode('{"a":1}');
    const file = fileEntry(0n, "data.json", "application/json", bytes);
    renderWithActor(
      <FilePreviewDialog
        file={file}
        open
        onOpenChange={() => undefined}
        onDownload={() => undefined}
      />,
      makeActor().actor,
    );

    // formatJson re-indents the document, so the raw one-line form is gone.
    expect(await screen.findByText(/"a": 1/)).toBeInTheDocument();
  });

  it("renders a CSV preview as a table", async () => {
    const bytes = new TextEncoder().encode("name,qty\nApples,3\nPears,5");
    const file = fileEntry(0n, "stock.csv", "text/csv", bytes);
    renderWithActor(
      <FilePreviewDialog
        file={file}
        open
        onOpenChange={() => undefined}
        onDownload={() => undefined}
      />,
      makeActor().actor,
    );

    const table = await screen.findByRole("table");
    expect(within(table).getByText("name")).toBeInTheDocument();
    expect(within(table).getByText("Apples")).toBeInTheDocument();
    expect(within(table).getByText("Pears")).toBeInTheDocument();
  });

  it("shows the fallback card with a download action for an unsupported type", async () => {
    const user = userEvent.setup();
    const onDownload = vi.fn();
    const file = fileEntry(
      0n,
      "archive.zip",
      "application/zip",
      new Uint8Array([1, 2, 3]),
    );
    renderWithActor(
      <FilePreviewDialog
        file={file}
        open
        onOpenChange={() => undefined}
        onDownload={onDownload}
      />,
      makeActor().actor,
    );

    expect(
      await screen.findByTestId("files.preview_fallback"),
    ).toBeInTheDocument();
    // The header still names the file and its type.
    expect(screen.getByText("archive.zip")).toBeInTheDocument();
    expect(screen.getByText(/ZIP archive/)).toBeInTheDocument();

    await user.click(screen.getByTestId("files.preview_download_button"));
    expect(onDownload).toHaveBeenCalledWith(file);
  });
});

describe("Files listing baseline", () => {
  it("lists a stored file and opens its preview from the row", async () => {
    const user = userEvent.setup();
    const bytes = new TextEncoder().encode("preview me");
    const file = fileEntry(0n, "readme.txt", "text/plain", bytes);
    const { actor } = makeActor([{ __kind__: "file", file }]);
    renderWithActor(<FilesPage />, actor);

    expect(await screen.findByText("readme.txt")).toBeInTheDocument();
    await user.click(screen.getByTestId("files.preview_button.1"));

    expect(await screen.findByText("preview me")).toBeInTheDocument();
  });

  it("lists a folder and opens it", async () => {
    const user = userEvent.setup();
    const folder: Folder = {
      id: 0n,
      name: "Photos",
      createdAt: NOW,
      updatedAt: NOW,
      section: StorageSection.local,
    };
    const { actor } = makeActor([{ __kind__: "folder", folder }]);
    renderWithActor(<FilesPage />, actor);

    expect(await screen.findByText("Photos")).toBeInTheDocument();
    await user.click(screen.getByTestId("files.open_folder_button.1"));
    await waitFor(() => {
      expect(screen.getByTestId("files.breadcrumb")).toHaveTextContent(
        "Photos",
      );
    });
  });
});
