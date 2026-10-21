import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import SettingsLib "../lib/settings";
import Types "../types/settings";

mixin (
  accessControlState : AccessControl.AccessControlState,
  states : Map.Map<Principal, SettingsLib.State>,
) {
  /// Reject anonymous callers and return the caller's own settings state,
  /// creating it on first use. Every endpoint is per-principal: a caller only
  /// ever reads or writes its own state.
  func settingsCallerState(caller : Principal) : SettingsLib.State {
    if (caller.isAnonymous()) {
      Runtime.trap("Sign in required");
    };
    switch (states.get(caller)) {
      case (?state) { state };
      case null {
        let state = SettingsLib.initState();
        states.add(caller, state);
        state;
      };
    };
  };

  public query ({ caller }) func getSettings() : async Types.UserSettings {
    if (caller.isAnonymous()) {
      Runtime.trap("Sign in required");
    };
    // Read-only: fall back to a fresh empty state so the query never mutates.
    let state = switch (states.get(caller)) {
      case (?state) { state };
      case null { SettingsLib.initState() };
    };
    SettingsLib.getSettings(state, caller);
  };

  public shared ({ caller }) func updateSettings(settings : Types.UserSettings) : async Types.UserSettings {
    SettingsLib.updateSettings(settingsCallerState(caller), caller, settings);
  };
};
