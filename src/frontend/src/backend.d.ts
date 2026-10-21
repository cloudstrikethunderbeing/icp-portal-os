import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
import type { ExternalBlob } from "@caffeineai/object-storage";
export type { ExternalBlob } from "@caffeineai/object-storage";
export interface AppRegistryEntry {
    id: Id;
    url: string;
    permissions: Array<string>;
    requiresAuth: boolean;
    icon: string;
    name: string;
    description: string;
    version: string;
    category: AppCategory;
    launchType: LaunchType;
    canisterId?: string;
}
export interface BugReport {
    id: Id;
    status: ReportStatus;
    createdAt: Timestamp;
    description: string;
    summary?: string;
    updatedAt: Timestamp;
    category?: string;
    reporter: UserId;
}
export interface CalcEntry {
    id: Id;
    result: string;
    expression: string;
    createdAt: Timestamp;
}
export interface Cell {
    value: Value;
    name: string;
}
export interface DirectoryEntry {
    app: AppRegistryEntry;
    installed: boolean;
    availability: Availability;
    favourite: boolean;
}
export interface Dock {
    appIds: Array<Id>;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export interface FileEntry {
    id: Id;
    ref: FileRef;
    name: string;
    createdAt: Timestamp;
    section: StorageSection;
    updatedAt: Timestamp;
    parentId?: Id;
}
export interface FileRef {
    blob: ExternalBlob;
    mimeType?: string;
    filename: string;
    sizeBytes?: bigint;
}
export interface Folder {
    id: Id;
    name: string;
    createdAt: Timestamp;
    section: StorageSection;
    updatedAt: Timestamp;
    parentId?: Id;
}
export interface HomeFolder {
    id: Id;
    name: string;
    createdAt: Timestamp;
    position: bigint;
}
export type HomeItem = {
    __kind__: "app";
    app: InstalledApp;
} | {
    __kind__: "folder";
    folder: HomeFolder;
};
export type Id = bigint;
export interface InstalledApp {
    id: Id;
    appId: Id;
    installedAt: Timestamp;
    position: bigint;
    folderId?: Id;
    favourite: boolean;
}
export type ListingItem = {
    __kind__: "file";
    file: FileEntry;
} | {
    __kind__: "folder";
    folder: Folder;
};
export interface NewBugReport {
    description: string;
}
export interface Note {
    id: Id;
    title: string;
    body: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    pinned: boolean;
    folderId?: Id;
    attachments: Array<FileRef>;
}
export interface NoteFolder {
    id: Id;
    name: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export interface Shortcut {
    id: Id;
    url: string;
    icon: string;
    name: string;
    createdAt: Timestamp;
    launchType: LaunchType;
    position: bigint;
    folderId?: Id;
    favourite: boolean;
}
export type Timestamp = bigint;
export type UserId = Principal;
export interface UserSettings {
    theme: string;
    reduceMotion: boolean;
    wallpaper: string;
    gridSize: bigint;
    wallpaperEnabled: boolean;
    updatedAt: Timestamp;
}
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export enum AppCategory {
    ai = "ai",
    media = "media",
    finance = "finance",
    social = "social",
    other = "other",
    productivity = "productivity",
    gaming = "gaming",
    business = "business",
    governance = "governance",
    developer = "developer"
}
export enum Availability {
    installed = "installed",
    available = "available",
    comingSoon = "comingSoon"
}
export enum LaunchType {
    native = "native",
    icpService = "icpService",
    comingSoon = "comingSoon",
    externalWeb = "externalWeb"
}
export enum ReportStatus {
    resolved = "resolved",
    closed = "closed",
    open = "open",
    inProgress = "inProgress"
}
export enum SortKey {
    name = "name",
    createdAt = "createdAt",
    size = "size",
    updatedAt = "updatedAt"
}
export enum SortOrder {
    asc = "asc",
    desc = "desc"
}
export enum StorageSection {
    icpCloud = "icpCloud",
    local = "local"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addCalcEntry(expression: string, result: string): Promise<CalcEntry>;
    addFile(name: string, parentId: bigint | null, section: StorageSection, ref: FileRef): Promise<FileEntry>;
    addNoteAttachment(id: bigint, ref: FileRef): Promise<Note | null>;
    /**
     * / Add a registered app to the caller's home screen. Returns the updated
     * / entry, or `null` when the app is not registered.
     */
    addToHomeScreen(appId: bigint): Promise<DirectoryEntry | null>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    clearCalcHistory(): Promise<void>;
    copyFile(id: bigint, parentId: bigint | null): Promise<FileEntry | null>;
    createFolder(name: string, parentId: bigint | null, section: StorageSection): Promise<Folder>;
    createHomeFolder(name: string): Promise<HomeFolder>;
    createNote(title: string, body: string, folderId: bigint | null): Promise<Note>;
    createNoteFolder(name: string): Promise<NoteFolder>;
    /**
     * / Create a personal shortcut or website link on the caller's home screen.
     */
    createShortcut(name: string, url: string, icon: string, launchType: LaunchType): Promise<Shortcut>;
    deleteFile(id: bigint): Promise<boolean>;
    deleteFolder(id: bigint): Promise<boolean>;
    deleteHomeFolder(id: bigint): Promise<boolean>;
    deleteNote(id: bigint): Promise<boolean>;
    deleteNoteFolder(id: bigint): Promise<boolean>;
    execute(qJson: string): Promise<Result>;
    getApiDoc(): Promise<string>;
    getAppRegistryEntry(id: bigint): Promise<AppRegistryEntry | null>;
    /**
     * / Read a single report. Admin only.
     */
    getBugReport(id: bigint): Promise<BugReport | null>;
    getCallerUserRole(): Promise<UserRole>;
    /**
     * / A single directory entry, or `null` when the app is not registered.
     */
    getDirectoryEntry(appId: bigint): Promise<DirectoryEntry | null>;
    getDock(): Promise<Dock>;
    getNote(id: bigint): Promise<Note | null>;
    getSettings(): Promise<UserSettings>;
    installApp(appId: bigint): Promise<InstalledApp | null>;
    isCallerAdmin(): Promise<boolean>;
    listAppRegistry(): Promise<Array<AppRegistryEntry>>;
    /**
     * / List every report in the workspace inbox, newest first. Admin only.
     */
    listBugReports(): Promise<Array<BugReport>>;
    listCalcHistory(): Promise<Array<CalcEntry>>;
    /**
     * / Browse the whole directory, optionally filtered by category.
     */
    listDirectory(category: AppCategory | null): Promise<Array<DirectoryEntry>>;
    /**
     * / The caller's favourited directory apps.
     */
    listFavourites(): Promise<Array<DirectoryEntry>>;
    listFolder(parentId: bigint | null, section: StorageSection): Promise<Array<ListingItem>>;
    listHomeItems(): Promise<Array<HomeItem>>;
    listInstalledApps(): Promise<Array<InstalledApp>>;
    listNoteFolders(): Promise<Array<NoteFolder>>;
    listNotes(folderId: bigint | null): Promise<Array<Note>>;
    /**
     * / The caller's own personal shortcuts and website links.
     */
    listShortcuts(): Promise<Array<Shortcut>>;
    moveAppToFolder(installedId: bigint, folderId: bigint | null): Promise<InstalledApp | null>;
    moveFile(id: bigint, parentId: bigint | null): Promise<FileEntry | null>;
    moveFolder(id: bigint, parentId: bigint | null): Promise<Folder | null>;
    /**
     * / Move one of the caller's own shortcuts into a home folder, or back to the
     * / home screen when `folderId` is `null`.
     */
    moveShortcutToFolder(id: bigint, folderId: bigint | null): Promise<Shortcut | null>;
    removeNoteAttachment(id: bigint, index: bigint): Promise<Note | null>;
    /**
     * / Remove one of the caller's own shortcuts.
     */
    removeShortcut(id: bigint): Promise<boolean>;
    renameFile(id: bigint, name: string): Promise<FileEntry | null>;
    renameFolder(id: bigint, name: string): Promise<Folder | null>;
    renameHomeFolder(id: bigint, name: string): Promise<HomeFolder | null>;
    renameNoteFolder(id: bigint, name: string): Promise<NoteFolder | null>;
    /**
     * / Rename one of the caller's own shortcuts.
     */
    renameShortcut(id: bigint, name: string): Promise<Shortcut | null>;
    reorderApps(orderedIds: Array<bigint>): Promise<Array<InstalledApp>>;
    schema(): Promise<string>;
    /**
     * / Search the directory by name or description (case-insensitive).
     */
    searchDirectory(term: string): Promise<Array<DirectoryEntry>>;
    searchFiles(term: string): Promise<Array<ListingItem>>;
    searchNotes(term: string): Promise<Array<Note>>;
    setAppFavourite(installedId: bigint, favourite: boolean): Promise<InstalledApp | null>;
    /**
     * / Attach an optional AI category and/or summary to a report. Admin only.
     * / Reporting and reading work fully when no AI result is present.
     */
    setBugReportAiResult(id: bigint, category: string | null, summary: string | null): Promise<BugReport | null>;
    /**
     * / Change a report's status; the backend records the last-updated timestamp.
     * / Admin only.
     */
    setBugReportStatus(id: bigint, status: ReportStatus): Promise<BugReport | null>;
    /**
     * / Favourite or unfavourite a registered app. Returns the updated entry, or
     * / `null` when the app is not registered.
     */
    setDirectoryFavourite(appId: bigint, favourite: boolean): Promise<DirectoryEntry | null>;
    setDock(appIds: Array<bigint>): Promise<Dock>;
    setNotePinned(id: bigint, pinned: boolean): Promise<Note | null>;
    /**
     * / Favourite or unfavourite one of the caller's own shortcuts.
     */
    setShortcutFavourite(id: bigint, favourite: boolean): Promise<Shortcut | null>;
    /**
     * / Change the icon of one of the caller's own shortcuts.
     */
    setShortcutIcon(id: bigint, icon: string): Promise<Shortcut | null>;
    /**
     * / Change the target URL of one of the caller's own shortcuts.
     */
    setShortcutUrl(id: bigint, url: string): Promise<Shortcut | null>;
    sortFolder(parentId: bigint | null, section: StorageSection, key: SortKey, order: SortOrder): Promise<Array<ListingItem>>;
    /**
     * / Submit a bug report. Any signed-in user may call this; the backend
     * / captures the reporter principal and the submission timestamp.
     */
    submitBugReport(input: NewBugReport): Promise<BugReport>;
    uninstallApp(installedId: bigint): Promise<boolean>;
    updateNote(id: bigint, title: string, body: string, folderId: bigint | null): Promise<Note | null>;
    updateSettings(settings: UserSettings): Promise<UserSettings>;
}
