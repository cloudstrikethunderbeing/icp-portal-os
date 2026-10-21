import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Types "../types/reports";

module {
  public type BugReport = Types.BugReport;
  public type NewBugReport = Types.NewBugReport;
  public type ReportStatus = Types.ReportStatus;
  public type Id = Types.Id;

  /// The workspace-wide bug-report inbox. Reports are not per-principal: every
  /// signed-in user submits into the same store, and only the workspace admin
  /// reads it. The reporting principal is captured on each record.
  public type State = {
    reports : Map.Map<Id, BugReport>;
    var nextId : Id;
  };

  public func initState() : State {
    {
      reports = Map.empty();
      var nextId = 0;
    };
  };

  /// Record a new report. The id, reporter, status and both timestamps are
  /// captured here, never supplied by the caller.
  public func submitReport(state : State, reporter : Types.UserId, input : NewBugReport) : BugReport {
    let now = Time.now();
    let report : BugReport = {
      id = state.nextId;
      reporter;
      description = input.description;
      status = #open;
      category = null;
      summary = null;
      createdAt = now;
      updatedAt = now;
    };
    state.reports.add(state.nextId, report);
    state.nextId += 1;
    report;
  };

  /// Every report, newest first. Admin-only at the API boundary.
  public func listReports(state : State) : [BugReport] {
    let all = state.reports.values().toArray();
    all.sort(
      func (a, b) {
        if (a.createdAt > b.createdAt) { #less } else if (a.createdAt < b.createdAt) {
          #greater;
        } else {
          #equal;
        };
      }
    );
  };

  /// A single report by id, or `null` when it does not exist.
  public func getReport(state : State, id : Id) : ?BugReport {
    state.reports.get(id);
  };

  /// Change a report's status and stamp the last-updated time. Returns the
  /// updated report, or `null` when the id is unknown.
  public func setReportStatus(state : State, id : Id, status : ReportStatus) : ?BugReport {
    switch (state.reports.get(id)) {
      case (?report) {
        let updated : BugReport = { report with status; updatedAt = Time.now() };
        state.reports.add(id, updated);
        ?updated;
      };
      case null { null };
    };
  };

  /// Attach an optional AI category and/or summary to a report. Passing `null`
  /// clears the field. Reporting and reading work fully without any AI result.
  public func setReportAiResult(state : State, id : Id, category : ?Text, summary : ?Text) : ?BugReport {
    switch (state.reports.get(id)) {
      case (?report) {
        let updated : BugReport = { report with category; summary; updatedAt = Time.now() };
        state.reports.add(id, updated);
        ?updated;
      };
      case null { null };
    };
  };
};
