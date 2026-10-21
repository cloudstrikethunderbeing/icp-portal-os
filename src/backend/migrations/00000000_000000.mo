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
  type AppsState = {
    registry : Map.Map<Nat, AppRegistryEntry>;
    installed : Map.Map<Nat, InstalledApp>;
    folders : Map.Map<Nat, HomeFolder>;
    var dock : Dock;
    var nextRegistryId : Nat;
    var nextInstalledId : Nat;
    var nextFolderId : Nat;
  };

  type UserSettings = {
    theme : Text;
    wallpaper : Text;
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

  public type OldActor = {};

  public type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    filesStates : Map.Map<Principal, FilesState>;
    notesStates : Map.Map<Principal, NotesState>;
    appsStates : Map.Map<Principal, AppsState>;
    settingsStates : Map.Map<Principal, SettingsState>;
    calcStates : Map.Map<Principal, CalculatorState>;
  };

  public func migration(_ : OldActor) : NewActor {
    {
      accessControlState = AccessControl.initState();
      filesStates = Map.empty();
      notesStates = Map.empty();
      appsStates = Map.empty();
      settingsStates = Map.empty();
      calcStates = Map.empty();
    };
  };
};
