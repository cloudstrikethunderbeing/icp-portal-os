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
  // The shape introduced by the previous migration (20261020_000000.mo):
  // a per-principal `shortcuts` map plus its id counter.
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

  /// Seed the "Explore ICP" folder and its four shortcuts into a principal's
  /// state, exactly as `AppsLib.initState()` seeds them. Additive and
  /// idempotent: it only runs for a principal whose shortcuts map is empty and
  /// who has no "Explore ICP" folder, so a user who already has shortcuts or
  /// the folder is left completely untouched and never receives duplicates.
  func seedExploreIcp(state : AppsState, now : Int) : AppsState {
    if (state.shortcuts.size() > 0) {
      return state;
    };
    let hasExploreFolder = state.folders.values().any(func (folder) = folder.name == "Explore ICP");
    if (hasExploreFolder) {
      return state;
    };
    // Reuse the existing folder id counter so the new folder id never
    // collides with a folder the user already created.
    let folderId = state.nextFolderId;
    let exploreFolder : HomeFolder = {
      id = folderId;
      name = "Explore ICP";
      position = folderId;
      createdAt = now;
    };
    state.folders.add(exploreFolder.id, exploreFolder);
    let exploreLinks : [(Text, Text, Text)] = [
      ("DFINITY", "https://dfinity.org", "dfinity"),
      ("Internet Computer", "https://internetcomputer.org", "icp"),
      ("OpenCloud", "https://opencloud.org", "cloud"),
      ("ICP Skills", "https://skills.internetcomputer.org", "skills"),
    ];
    var shortcutId = state.nextShortcutId;
    for ((name, url, icon) in exploreLinks.values()) {
      state.shortcuts.add(
        shortcutId,
        {
          id = shortcutId;
          name;
          url;
          icon;
          launchType = #externalWeb;
          position = shortcutId;
          folderId = ?exploreFolder.id;
          favourite = false;
          createdAt = now;
        },
      );
      shortcutId += 1;
    };
    state.nextShortcutId := shortcutId;
    state.nextFolderId := folderId + 1;
    state;
  };

  /// Reconcile a principal's stored registry map with the corrected
  /// catalogue. Additive and idempotent: it only rewrites the specific entries
  /// that drifted (id=13 IC Explorer, id=18 OpenChat) and adds the AI Agent
  /// entry (id=35) when absent. Every other stored entry is left untouched, so
  /// running it again changes nothing.
  func reconcileRegistry(state : AppsState) : AppsState {
    // id=13: point IC Explorer at the confirmed destination.
    switch (state.registry.get(13)) {
      case (?entry) {
        state.registry.add(13, { entry with name = "IC Explorer"; url = "https://www.icexplorer.io/" });
      };
      case null {};
    };
    // id=18: OpenChat is not ready yet, so it launches as coming soon.
    switch (state.registry.get(18)) {
      case (?entry) {
        state.registry.add(18, { entry with launchType = #comingSoon });
      };
      case null {};
    };
    // id=35: add the AI Agent entry when the stored registry lacks it.
    switch (state.registry.get(35)) {
      case (?_) {};
      case null {
        state.registry.add(
          35,
          {
            id = 35;
            name = "AI Agent";
            icon = "ai";
            category = #ai;
            description = "Ask questions about your workspace.";
            url = "";
            canisterId = null;
            requiresAuth = false;
            permissions = [];
            version = "1.0.0";
            launchType = #native;
          },
        );
      };
    };
    state;
  };

  public func migration(old : OldActor) : NewActor {
    let now = 0;
    {
      accessControlState = old.accessControlState;
      filesStates = old.filesStates;
      notesStates = old.notesStates;
      appsStates = old.appsStates.map(
        func(_, state) {
          reconcileRegistry(seedExploreIcp(state, now));
        }
      );
      settingsStates = old.settingsStates;
      calcStates = old.calcStates;
      reportsState = old.reportsState;
    };
  };
};
