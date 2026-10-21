import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import AppsLib "../lib/apps";
import Types "../types/apps";

mixin (
  accessControlState : AccessControl.AccessControlState,
  states : Map.Map<Principal, AppsLib.State>,
) {
  /// Reject anonymous callers and return the caller's own home-screen state,
  /// creating it on first use. Every endpoint is per-principal: a caller only
  /// ever reads or writes its own state.
  func appsCallerState(caller : Principal) : AppsLib.State {
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

  /// Read-only counterpart of `appsCallerState`: reject anonymous callers and
  /// return the caller's own state, or `null` when the caller has none yet.
  func appsCallerStateOpt(caller : Principal) : ?AppsLib.State {
    if (caller.isAnonymous()) {
      Runtime.trap("Sign in required");
    };
    states.get(caller);
  };

  public query ({ caller }) func listAppRegistry() : async [Types.AppRegistryEntry] {
    let state = appsCallerState(caller);
    AppsLib.listRegistry(state);
  };

  public query ({ caller }) func getAppRegistryEntry(id : Nat) : async ?Types.AppRegistryEntry {
    let state = appsCallerState(caller);
    AppsLib.getRegistryEntry(state, id);
  };

  public shared ({ caller }) func installApp(appId : Nat) : async ?Types.InstalledApp {
    let state = appsCallerState(caller);
    AppsLib.installApp(state, appId);
  };

  public shared ({ caller }) func uninstallApp(installedId : Nat) : async Bool {
    let state = appsCallerState(caller);
    AppsLib.uninstallApp(state, installedId);
  };

  public query ({ caller }) func listInstalledApps() : async [Types.InstalledApp] {
    let state = appsCallerState(caller);
    AppsLib.listInstalled(state);
  };

  public shared ({ caller }) func setAppFavourite(installedId : Nat, favourite : Bool) : async ?Types.InstalledApp {
    let state = appsCallerState(caller);
    AppsLib.setFavourite(state, installedId, favourite);
  };

  public shared ({ caller }) func reorderApps(orderedIds : [Nat]) : async [Types.InstalledApp] {
    let state = appsCallerState(caller);
    AppsLib.reorder(state, orderedIds);
  };

  public shared ({ caller }) func createHomeFolder(name : Text) : async Types.HomeFolder {
    let state = appsCallerState(caller);
    AppsLib.createFolder(state, name);
  };

  public shared ({ caller }) func renameHomeFolder(id : Nat, name : Text) : async ?Types.HomeFolder {
    let state = appsCallerState(caller);
    AppsLib.renameFolder(state, id, name);
  };

  public shared ({ caller }) func moveAppToFolder(installedId : Nat, folderId : ?Nat) : async ?Types.InstalledApp {
    let state = appsCallerState(caller);
    AppsLib.moveAppToFolder(state, installedId, folderId);
  };

  public shared ({ caller }) func deleteHomeFolder(id : Nat) : async Bool {
    let state = appsCallerState(caller);
    AppsLib.deleteFolder(state, id);
  };

  public query ({ caller }) func listHomeItems() : async [Types.HomeItem] {
    let state = appsCallerState(caller);
    AppsLib.listHomeItems(state);
  };

  public query ({ caller }) func getDock() : async Types.Dock {
    let state = appsCallerState(caller);
    AppsLib.getDock(state);
  };

  public shared ({ caller }) func setDock(appIds : [Nat]) : async Types.Dock {
    let state = appsCallerState(caller);
    AppsLib.setDock(state, appIds);
  };

  /// The caller's own personal shortcuts and website links.
  public query ({ caller }) func listShortcuts() : async [Types.Shortcut] {
    let state = appsCallerState(caller);
    AppsLib.listShortcuts(state);
  };

  /// Create a personal shortcut or website link on the caller's home screen.
  public shared ({ caller }) func createShortcut(name : Text, url : Text, icon : Text, launchType : Types.LaunchType) : async Types.Shortcut {
    let state = appsCallerState(caller);
    AppsLib.createShortcut(state, name, url, icon, launchType);
  };

  /// Rename one of the caller's own shortcuts.
  public shared ({ caller }) func renameShortcut(id : Nat, name : Text) : async ?Types.Shortcut {
    let state = appsCallerState(caller);
    AppsLib.renameShortcut(state, id, name);
  };

  /// Change the icon of one of the caller's own shortcuts.
  public shared ({ caller }) func setShortcutIcon(id : Nat, icon : Text) : async ?Types.Shortcut {
    let state = appsCallerState(caller);
    AppsLib.setShortcutIcon(state, id, icon);
  };

  /// Change the target URL of one of the caller's own shortcuts.
  public shared ({ caller }) func setShortcutUrl(id : Nat, url : Text) : async ?Types.Shortcut {
    let state = appsCallerState(caller);
    AppsLib.setShortcutUrl(state, id, url);
  };

  /// Favourite or unfavourite one of the caller's own shortcuts.
  public shared ({ caller }) func setShortcutFavourite(id : Nat, favourite : Bool) : async ?Types.Shortcut {
    let state = appsCallerState(caller);
    AppsLib.setShortcutFavourite(state, id, favourite);
  };

  /// Move one of the caller's own shortcuts into a home folder, or back to the
  /// home screen when `folderId` is `null`.
  public shared ({ caller }) func moveShortcutToFolder(id : Nat, folderId : ?Nat) : async ?Types.Shortcut {
    let state = appsCallerState(caller);
    AppsLib.moveShortcutToFolder(state, id, folderId);
  };

  /// Remove one of the caller's own shortcuts.
  public shared ({ caller }) func removeShortcut(id : Nat) : async Bool {
    let state = appsCallerState(caller);
    AppsLib.removeShortcut(state, id);
  };
};
