import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import CalculatorLib "../lib/calculator";
import Types "../types/calculator";

mixin (
  accessControlState : AccessControl.AccessControlState,
  states : Map.Map<Principal, CalculatorLib.State>,
) {
  /// Reject anonymous callers and return the caller's own calculator state,
  /// creating it on first use. Every endpoint is per-principal: a caller only
  /// ever reads or writes its own state.
  func calcCallerState(caller : Principal) : CalculatorLib.State {
    if (caller.isAnonymous()) {
      Runtime.trap("Sign in required");
    };
    switch (states.get(caller)) {
      case (?state) { state };
      case null {
        let state = CalculatorLib.initState();
        states.add(caller, state);
        state;
      };
    };
  };

  /// Read-only counterpart of `calcCallerState`: reject anonymous callers and
  /// return the caller's own state, or `null` when the caller has none yet.
  func calcCallerStateOpt(caller : Principal) : ?CalculatorLib.State {
    if (caller.isAnonymous()) {
      Runtime.trap("Sign in required");
    };
    states.get(caller);
  };

  public shared ({ caller }) func addCalcEntry(expression : Text, result : Text) : async Types.CalcEntry {
    CalculatorLib.addEntry(calcCallerState(caller), expression, result);
  };

  public query ({ caller }) func listCalcHistory() : async [Types.CalcEntry] {
    switch (calcCallerStateOpt(caller)) {
      case (?state) { CalculatorLib.listHistory(state) };
      case null { [] };
    };
  };

  public shared ({ caller }) func clearCalcHistory() : async () {
    CalculatorLib.clearHistory(calcCallerState(caller));
  };
};
