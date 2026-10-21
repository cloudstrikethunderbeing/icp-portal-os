import Map "mo:core/Map";
import Principal "mo:core/Principal";
import AccessControl "mo:caffeineai-authorization/access-control";

module {
  // Inlined stable state shapes. Migrations must be self-contained: they may
  // only import from `mo:core/...` and mops packages, never project modules.
  type StorageSection = { #local; #icpCloud };
  type FileRef = {
    blob : Blob;
    filename : Text;
    mimeType : ?Text;
    sizeBytes : ?Nat;
  };
  type Folder = {
    id : Nat;
    name : Text;
    parentId : ?Nat;
    section : StorageSection;
    createdAt : Int;
    updatedAt : Int;
  };
  type FileEntry = {
    id : Nat;
    name : Text;
    parentId : ?Nat;
    section : StorageSection;
    ref : FileRef;
    createdAt : Int;
    updatedAt : Int;
  };
  type FilesState = {
    folders : Map.Map<Nat, Folder>;
    files : Map.Map<Nat, FileEntry>;
    var nextFolderId : Nat;
    var nextFileId : Nat;
  };

  type NoteFolder = {
    id : Nat;
    name : Text;
    createdAt : Int;
    updatedAt : Int;
  };
  type Note = {
    id : Nat;
    title : Text;
    body : Text;
    folderId : ?Nat;
    pinned : Bool;
    attachments : [FileRef];
    createdAt : Int;
    updatedAt : Int;
  };
  type NotesState = {
    notes : Map.Map<Nat, Note>;
    folders : Map.Map<Nat, NoteFolder>;
    var nextNoteId : Nat;
    var nextFolderId : Nat;
  };

  type LaunchType = { #native; #icpService; #externalWeb; #comingSoon };
  type AppCategory = {
    #ai;
    #finance;
    #social;
    #productivity;
    #governance;
    #gaming;
    #media;
    #developer;
    #business;
    #other;
  };
  type AppRegistryEntry = {
    id : Nat;
    name : Text;
    icon : Text;
    category : AppCategory;
    description : Text;
    url : Text;
    canisterId : ?Text;
    requiresAuth : Bool;
    permissions : [Text];
    version : Text;
    launchType : LaunchType;
  };
  type InstalledApp = {
    id : Nat;
    appId : Nat;
    folderId : ?Nat;
    position : Nat;
    favourite : Bool;
    installedAt : Int;
  };
  type HomeFolder = {
    id : Nat;
    name : Text;
    position : Nat;
    createdAt : Int;
  };
  type Dock = { appIds : [Nat] };
  type Shortcut = {
    id : Nat;
    name : Text;
    url : Text;
    icon : Text;
    launchType : LaunchType;
    position : Nat;
    folderId : ?Nat;
    favourite : Bool;
    createdAt : Int;
  };
  type AppsState = {
    registry : Map.Map<Nat, AppRegistryEntry>;
    shortcuts : Map.Map<Nat, Shortcut>;
    installed : Map.Map<Nat, InstalledApp>;
    folders : Map.Map<Nat, HomeFolder>;
    var dock : Dock;
    var nextRegistryId : Nat;
    var nextShortcutId : Nat;
    var nextInstalledId : Nat;
    var nextFolderId : Nat;
  };

  // The settings shape introduced by the previous migration
  // (20261022_000000.mo): includes the per-principal wallpaper on/off toggle.
  type UserSettings = {
    theme : Text;
    wallpaper : Text;
    wallpaperEnabled : Bool;
    gridSize : Nat;
    reduceMotion : Bool;
    updatedAt : Int;
  };
  type SettingsState = {
    settings : Map.Map<Principal, UserSettings>;
  };

  type CalcEntry = {
    id : Nat;
    expression : Text;
    result : Text;
    createdAt : Int;
  };
  type CalculatorState = {
    history : Map.Map<Nat, CalcEntry>;
    var nextId : Nat;
  };

  type ReportStatus = { #open; #inProgress; #resolved; #closed };
  type BugReport = {
    id : Nat;
    reporter : Principal;
    description : Text;
    status : ReportStatus;
    category : ?Text;
    summary : ?Text;
    createdAt : Int;
    updatedAt : Int;
  };
  type ReportsState = {
    reports : Map.Map<Nat, BugReport>;
    var nextId : Nat;
  };

  public type OldActor = {
    accessControlState : AccessControl.AccessControlState;
    filesStates : Map.Map<Principal, FilesState>;
    notesStates : Map.Map<Principal, NotesState>;
    appsStates : Map.Map<Principal, AppsState>;
    settingsStates : Map.Map<Principal, SettingsState>;
    calcStates : Map.Map<Principal, CalculatorState>;
    reportsState : ReportsState;
  };

  public type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    filesStates : Map.Map<Principal, FilesState>;
    notesStates : Map.Map<Principal, NotesState>;
    appsStates : Map.Map<Principal, AppsState>;
    settingsStates : Map.Map<Principal, SettingsState>;
    calcStates : Map.Map<Principal, CalculatorState>;
    reportsState : ReportsState;
  };

  /// Align a principal's stored AI Agent registry entry (id=35) with the live
  /// catalogue, which requires sign-in. Additive and idempotent: it only
  /// rewrites id=35 when it is present and still carries the stale
  /// `requiresAuth = false`; every other field of that entry and every other
  /// stored registry entry, installed app, folder, shortcut, dock entry and
  /// user preference is left untouched. Running it again changes nothing.
  func reconcileAiAgentAuth(state : AppsState) : AppsState {
    switch (state.registry.get(35)) {
      case (?entry) {
        if (not entry.requiresAuth) {
          state.registry.add(35, { entry with requiresAuth = true });
        };
      };
      case null {};
    };
    state;
  };

  public func migration(old : OldActor) : NewActor {
    {
      accessControlState = old.accessControlState;
      filesStates = old.filesStates;
      notesStates = old.notesStates;
      appsStates = old.appsStates.map(
        func(_, state) { reconcileAiAgentAuth(state) }
      );
      settingsStates = old.settingsStates;
      calcStates = old.calcStates;
      reportsState = old.reportsState;
    };
  };
};
