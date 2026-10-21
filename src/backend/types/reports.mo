import Common "common";

module {
  public type Id = Common.Id;
  public type Timestamp = Common.Timestamp;
  public type UserId = Common.UserId;
  public type WorkspaceError = Common.WorkspaceError;

  /// Lifecycle status of a bug report, set by the workspace admin.
  public type ReportStatus = {
    #open;
    #inProgress;
    #resolved;
    #closed;
  };

  /// A bug report submitted by a signed-in user. The reporting principal and
  /// both timestamps are captured by the backend, never supplied by the caller.
  public type BugReport = {
    id : Id;
    reporter : UserId;
    description : Text;
    status : ReportStatus;
    /// Optional AI-generated category or summary. Reporting works fully
    /// without it; `null` means no AI assistance was applied.
    category : ?Text;
    summary : ?Text;
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };

  /// The caller-supplied fields of a new report. The backend fills in the id,
  /// reporter, status and timestamps.
  public type NewBugReport = {
    description : Text;
  };
};
