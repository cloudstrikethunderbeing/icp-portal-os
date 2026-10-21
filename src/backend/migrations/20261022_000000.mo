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
  // (20261021_000000.mo): no wallpaper on/off preference yet.
  type OldUserSettings = {
    theme : Text;
    wallpaper : Text;
    gridSize : Nat;
    reduceMotion : Bool;
    updatedAt : Int;
  };
  type OldSettingsState = {
    settings : Map.Map<Principal, OldUserSettings>;
  };

  // The new settings shape: adds the per-principal wallpaper on/off toggle.
  type NewUserSettings = {
    theme : Text;
    wallpaper : Text;
    wallpaperEnabled : Bool;
    gridSize : Nat;
    reduceMotion : Bool;
    updatedAt : Int;
  };
  type NewSettingsState = {
    settings : Map.Map<Principal, NewUserSettings>;
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
    settingsStates : Map.Map<Principal, OldSettingsState>;
    calcStates : Map.Map<Principal, CalculatorState>;
    reportsState : ReportsState;
  };

  public type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    filesStates : Map.Map<Principal, FilesState>;
    notesStates : Map.Map<Principal, NotesState>;
    appsStates : Map.Map<Principal, AppsState>;
    settingsStates : Map.Map<Principal, NewSettingsState>;
    calcStates : Map.Map<Principal, CalculatorState>;
    reportsState : ReportsState;
  };

  /// Add the wallpaper on/off preference to every stored settings record,
  /// defaulting to enabled so an existing wallpaper stays visible. Every other
  /// field is preserved unchanged.
  func migrateSettings(state : OldSettingsState) : NewSettingsState {
    {
      settings = state.settings.map(
        func(_, settings) {
          {
            theme = settings.theme;
            wallpaper = settings.wallpaper;
            wallpaperEnabled = true;
            gridSize = settings.gridSize;
            reduceMotion = settings.reduceMotion;
            updatedAt = settings.updatedAt;
          };
        }
      );
    };
  };

  public func migration(old : OldActor) : NewActor {
    {
      accessControlState = old.accessControlState;
      filesStates = old.filesStates;
      notesStates = old.notesStates;
      appsStates = old.appsStates;
      settingsStates = old.settingsStates.map(
        func(_, state) { migrateSettings(state) }
      );
      calcStates = old.calcStates;
      reportsState = old.reportsState;
    };
  };
};
