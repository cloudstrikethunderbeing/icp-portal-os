import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import ReportsLib "../lib/reports";
import Types "../types/reports";

mixin (
  accessControlState : AccessControl.AccessControlState,
  state : ReportsLib.State,
) {
  /// Reject anonymous callers. Submitting a report is open to any signed-in
  /// user; the reporting principal is captured by the backend.
  func reportsCaller(caller : Principal) : Principal {
    if (caller.isAnonymous()) {
      Runtime.trap("Sign in required");
    };
    caller;
  };

  /// Reject anyone who is not the workspace admin. Every inbox read and status
  /// change goes through this guard.
  func requireAdmin(caller : Principal) {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only the workspace admin can view or manage reports");
    };
  };

  /// Submit a bug report. Any signed-in user may call this; the backend
  /// captures the reporter principal and the submission timestamp.
  public shared ({ caller }) func submitBugReport(input : Types.NewBugReport) : async Types.BugReport {
    ReportsLib.submitReport(state, reportsCaller(caller), input);
  };

  /// List every report in the workspace inbox, newest first. Admin only.
  public query ({ caller }) func listBugReports() : async [Types.BugReport] {
    requireAdmin(caller);
    ReportsLib.listReports(state);
  };

  /// Read a single report. Admin only.
  public query ({ caller }) func getBugReport(id : Nat) : async ?Types.BugReport {
    requireAdmin(caller);
    ReportsLib.getReport(state, id);
  };

  /// Change a report's status; the backend records the last-updated timestamp.
  /// Admin only.
  public shared ({ caller }) func setBugReportStatus(id : Nat, status : Types.ReportStatus) : async ?Types.BugReport {
    requireAdmin(caller);
    ReportsLib.setReportStatus(state, id, status);
  };

  /// Attach an optional AI category and/or summary to a report. Admin only.
  /// Reporting and reading work fully when no AI result is present.
  public shared ({ caller }) func setBugReportAiResult(id : Nat, category : ?Text, summary : ?Text) : async ?Types.BugReport {
    requireAdmin(caller);
    ReportsLib.setReportAiResult(state, id, category, summary);
  };
};
