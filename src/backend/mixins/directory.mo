import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import AppsLib "../lib/apps";
import Types "../types/apps";

/// The ICP App Directory: a browsable, categorised view of the curated
/// application catalogue, plus per-user favourites and "add to home screen".
///
/// The catalogue itself is global and seeded in `AppsLib`; this mixin only
/// reads it. Favourites and installs are per-principal and live in the
/// caller's own `AppsLib.State`, so a caller never sees or modifies another
/// principal's directory state.
mixin (
  accessControlState : AccessControl.AccessControlState,
  states : Map.Map<Principal, AppsLib.State>,
) {
  /// A directory listing entry: the catalogue entry plus the caller's own
  /// availability, favourite and installed flags.
  public type DirectoryEntry = {
    app : Types.AppRegistryEntry;
    availability : Types.Availability;
    favourite : Bool;
    installed : Bool;
  };

  /// Reject anonymous callers and return the caller's own workspace state,
  /// creating it on first use.
  func directoryCallerState(caller : Principal) : AppsLib.State {
    if (caller.isAnonymous()) {
      Runtime.trap("Sign in required");
    };
    switch (states.get(caller)) {
      case (?state) { state };
      case null {
        let state = AppsLib.initState();
        states.add(caller, state);
        state;
      };
    };
  };

  /// Read-only counterpart of `directoryCallerState`: reject anonymous callers and
  /// return the caller's own state, or `null` when the caller has none yet.
  func directoryCallerStateOpt(caller : Principal) : ?AppsLib.State {
    if (caller.isAnonymous()) {
      Runtime.trap("Sign in required");
    };
    states.get(caller);
  };

  /// The registry entry for `appId`, or `null` when it is not registered.
  func registryEntry(state : AppsLib.State, appId : Nat) : ?Types.AppRegistryEntry {
    AppsLib.getRegistryEntry(state, appId);
  };

  /// Whether the caller has installed `appId`.
  func isInstalled(state : AppsLib.State, appId : Nat) : Bool {
    state.installed.values().any(func (app) = app.appId == appId);
  };

  /// Whether the caller has favourited `appId`.
  func isFavourite(state : AppsLib.State, appId : Nat) : Bool {
    state.installed.values().any(func (app) = app.appId == appId and app.favourite);
  };

  /// The caller's availability for a catalogue entry: `#installed` when the
  /// caller has it on their home screen, otherwise `#comingSoon` for entries
  /// that cannot launch yet, otherwise `#available`.
  func availabilityOf(state : AppsLib.State, app : Types.AppRegistryEntry) : Types.Availability {
    if (isInstalled(state, app.id)) {
      #installed;
    } else if (app.launchType == #comingSoon) {
      #comingSoon;
    } else {
      #available;
    };
  };

  func toEntry(state : AppsLib.State, app : Types.AppRegistryEntry) : DirectoryEntry {
    {
      app;
      availability = availabilityOf(state, app);
      favourite = isFavourite(state, app.id);
      installed = isInstalled(state, app.id);
    };
  };

  /// Browse the whole directory, optionally filtered by category.
  public query ({ caller }) func listDirectory(category : ?Types.AppCategory) : async [DirectoryEntry] {
    let state = directoryCallerState(caller);
    let all = AppsLib.listRegistry(state);
    let filtered = switch (category) {
      case null { all };
      case (?cat) { all.filter(func (app) = app.category == cat) };
    };
    filtered.map(func (app) = toEntry(state, app));
  };

  /// Search the directory by name or description (case-insensitive).
  public query ({ caller }) func searchDirectory(term : Text) : async [DirectoryEntry] {
    let state = directoryCallerState(caller);
    let needle = term.toLower();
    let all = AppsLib.listRegistry(state);
    let matched = all.filter(
      func (app) {
        app.name.toLower().contains(#text needle) or app.description.toLower().contains(#text needle);
      }
    );
    matched.map(func (app) = toEntry(state, app));
  };

  /// A single directory entry, or `null` when the app is not registered.
  public query ({ caller }) func getDirectoryEntry(appId : Nat) : async ?DirectoryEntry {
    let state = directoryCallerState(caller);
    switch (registryEntry(state, appId)) {
      case null { null };
      case (?app) { ?toEntry(state, app) };
    };
  };

  /// The caller's favourited directory apps.
  public query ({ caller }) func listFavourites() : async [DirectoryEntry] {
    let state = directoryCallerState(caller);
    let all = AppsLib.listRegistry(state);
    let favourites = all.filter(func (app) = isFavourite(state, app.id));
    favourites.map(func (app) = toEntry(state, app));
  };

  /// Favourite or unfavourite a registered app. Returns the updated entry, or
  /// `null` when the app is not registered.
  public shared ({ caller }) func setDirectoryFavourite(appId : Nat, favourite : Bool) : async ?DirectoryEntry {
    let state = directoryCallerState(caller);
    switch (registryEntry(state, appId)) {
      case null { null };
      case (?app) {
        switch (state.installed.values().find(func (installed) = installed.appId == appId)) {
          case (?installed) {
            ignore AppsLib.setFavourite(state, installed.id, favourite);
          };
          case null {
            // Favouriting a catalogue entry the caller has not installed yet
            // installs it so the favourite has somewhere to live.
            switch (AppsLib.installApp(state, appId)) {
              case (?newInstalled) {
                ignore AppsLib.setFavourite(state, newInstalled.id, favourite);
              };
              case null {};
            };
          };
        };
        ?toEntry(state, app);
      };
    };
  };

  /// Add a registered app to the caller's home screen. Returns the updated
  /// entry, or `null` when the app is not registered.
  public shared ({ caller }) func addToHomeScreen(appId : Nat) : async ?DirectoryEntry {
    let state = directoryCallerState(caller);
    switch (registryEntry(state, appId)) {
      case null { null };
      case (?app) {
        ignore AppsLib.installApp(state, appId);
        ?toEntry(state, app);
      };
    };
  };
};
