import Common "common";

module {
  public type Id = Common.Id;
  public type Timestamp = Common.Timestamp;
  public type WorkspaceError = Common.WorkspaceError;

  /// A persisted calculator history entry.
  public type CalcEntry = {
    id : Id;
    expression : Text;
    result : Text;
    createdAt : Timestamp;
  };
};
