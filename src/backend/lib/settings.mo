import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Types "../types/settings";

module {
  public type UserSettings = Types.UserSettings;
  public type WorkspaceError = Types.WorkspaceError;

  /// Per-principal settings state.
  public type State = {
    settings : Map.Map<Principal, UserSettings>;
  };

  public func initState() : State {
    {
      settings = Map.empty();
    };
  };

  /// The caller's settings, or sensible defaults when none are stored yet.
  public func getSettings(state : State, user : Principal) : UserSettings {
    switch (state.settings.get(user)) {
      case (?settings) { settings };
      case null {
        {
          theme = "system";
          wallpaper = "default";
          wallpaperEnabled = true;
          gridSize = 4;
          reduceMotion = false;
          updatedAt = 0;
        };
      };
    };
  };

  public func updateSettings(state : State, user : Principal, settings : UserSettings) : UserSettings {
    let updated : UserSettings = { settings with updatedAt = Time.now() };
    state.settings.add(user, updated);
    updated;
  };
};
