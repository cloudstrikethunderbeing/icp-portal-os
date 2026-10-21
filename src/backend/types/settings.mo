import Common "common";

module {
  public type Timestamp = Common.Timestamp;
  public type WorkspaceError = Common.WorkspaceError;

  /// Per-principal application settings.
  public type UserSettings = {
    theme : Text;
    wallpaper : Text;
    wallpaperEnabled : Bool;
    gridSize : Nat;
    reduceMotion : Bool;
    updatedAt : Timestamp;
  };
};
