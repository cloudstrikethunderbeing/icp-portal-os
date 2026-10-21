import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import FilesLib "../lib/files";
import Types "../types/files";

mixin (
  accessControlState : AccessControl.AccessControlState,
  states : Map.Map<Principal, FilesLib.State>,
) {
  /// Reject anonymous callers and return the caller's own workspace state,
  /// creating it on first use. Every endpoint is per-principal: a caller only
  /// ever reads or writes its own state.
  func filesCallerState(caller : Principal) : FilesLib.State {
    if (caller.isAnonymous()) {
      Runtime.trap("Sign in required");
    };
    switch (states.get(caller)) {
      case (?state) { state };
      case null {
        let state = FilesLib.initState();
        states.add(caller, state);
        state;
      };
    };
  };

  /// Read-only counterpart of `filesCallerState`: reject anonymous callers and
  /// return the caller's own state, or `null` when the caller has none yet.
  func filesCallerStateOpt(caller : Principal) : ?FilesLib.State {
    if (caller.isAnonymous()) {
      Runtime.trap("Sign in required");
    };
    states.get(caller);
  };

  public shared ({ caller }) func createFolder(name : Text, parentId : ?Nat, section : Types.StorageSection) : async Types.Folder {
    FilesLib.createFolder(filesCallerState(caller), name, parentId, section);
  };

  public shared ({ caller }) func renameFolder(id : Nat, name : Text) : async ?Types.Folder {
    FilesLib.renameFolder(filesCallerState(caller), id, name);
  };

  public shared ({ caller }) func moveFolder(id : Nat, parentId : ?Nat) : async ?Types.Folder {
    FilesLib.moveFolder(filesCallerState(caller), id, parentId);
  };

  public shared ({ caller }) func deleteFolder(id : Nat) : async Bool {
    FilesLib.deleteFolder(filesCallerState(caller), id);
  };

  public shared ({ caller }) func addFile(name : Text, parentId : ?Nat, section : Types.StorageSection, ref : Types.FileRef) : async Types.FileEntry {
    FilesLib.addFile(filesCallerState(caller), name, parentId, section, ref);
  };

  public shared ({ caller }) func renameFile(id : Nat, name : Text) : async ?Types.FileEntry {
    FilesLib.renameFile(filesCallerState(caller), id, name);
  };

  public shared ({ caller }) func moveFile(id : Nat, parentId : ?Nat) : async ?Types.FileEntry {
    FilesLib.moveFile(filesCallerState(caller), id, parentId);
  };

  public shared ({ caller }) func copyFile(id : Nat, parentId : ?Nat) : async ?Types.FileEntry {
    FilesLib.copyFile(filesCallerState(caller), id, parentId);
  };

  public shared ({ caller }) func deleteFile(id : Nat) : async Bool {
    FilesLib.deleteFile(filesCallerState(caller), id);
  };

  public query ({ caller }) func listFolder(parentId : ?Nat, section : Types.StorageSection) : async [Types.ListingItem] {
    switch (filesCallerStateOpt(caller)) {
      case (?state) { FilesLib.listFolder(state, parentId, section) };
      case null { [] };
    };
  };

  public query ({ caller }) func searchFiles(term : Text) : async [Types.ListingItem] {
    switch (filesCallerStateOpt(caller)) {
      case (?state) { FilesLib.search(state, term) };
      case null { [] };
    };
  };

  public query ({ caller }) func sortFolder(parentId : ?Nat, section : Types.StorageSection, key : Types.SortKey, order : Types.SortOrder) : async [Types.ListingItem] {
    switch (filesCallerStateOpt(caller)) {
      case (?state) { FilesLib.sortItems(FilesLib.listFolder(state, parentId, section), key, order) };
      case null { [] };
    };
  };
};
