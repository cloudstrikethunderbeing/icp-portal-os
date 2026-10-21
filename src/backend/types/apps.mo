import Common "common";

module {
  public type Id = Common.Id;
  public type Timestamp = Common.Timestamp;
  public type WorkspaceError = Common.WorkspaceError;

  /// How an app is launched.
  public type LaunchType = {
    #native;
    #icpService;
    #externalWeb;
    #comingSoon;
  };

  /// App category used by the directory.
  public type AppCategory = {
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

  /// Availability of a curated directory entry, as seen by the caller.
  /// `#installed` is derived from the caller's own installed set; a
  /// `#comingSoon` entry can never launch.
  public type Availability = {
    #installed;
    #available;
    #comingSoon;
  };

  /// A registry entry describing an ICP application.
  public type AppRegistryEntry = {
    id : Id;
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

  /// A user's personal shortcut or website link. Stored per principal; the
  /// user can add, rename, re-icon and remove their own shortcuts.
  public type Shortcut = {
    id : Id;
    name : Text;
    url : Text;
    icon : Text;
    launchType : LaunchType;
    position : Nat;
    folderId : ?Id;
    favourite : Bool;
    createdAt : Timestamp;
  };

  /// An app installed onto the user's home screen.
  public type InstalledApp = {
    id : Id;
    appId : Id;
    folderId : ?Id;
    position : Nat;
    favourite : Bool;
    installedAt : Timestamp;
  };

  /// A home-screen folder grouping installed apps.
  public type HomeFolder = {
    id : Id;
    name : Text;
    position : Nat;
    createdAt : Timestamp;
  };

  /// The user's dock configuration.
  public type Dock = {
    appIds : [Id];
  };

  /// A single home-screen layout item — either an app or a folder.
  public type HomeItem = {
    #app : InstalledApp;
    #folder : HomeFolder;
  };
};
