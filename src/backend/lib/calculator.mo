import Map "mo:core/Map";
import Time "mo:core/Time";
import Types "../types/calculator";

module {
  public type CalcEntry = Types.CalcEntry;
  public type WorkspaceError = Types.WorkspaceError;

  /// Per-principal calculator history state.
  public type State = {
    history : Map.Map<Nat, CalcEntry>;
    var nextId : Nat;
  };

  public func initState() : State {
    {
      history = Map.empty();
      var nextId = 0;
    };
  };

  public func addEntry(state : State, expression : Text, result : Text) : CalcEntry {
    let id = state.nextId;
    state.nextId := id + 1;
    let entry : CalcEntry = {
      id;
      expression;
      result;
      createdAt = Time.now();
    };
    state.history.add(id, entry);
    entry;
  };

  public func listHistory(state : State) : [CalcEntry] {
    state.history.values().toArray();
  };

  public func clearHistory(state : State) : () {
    state.history.clear();
  };
};
