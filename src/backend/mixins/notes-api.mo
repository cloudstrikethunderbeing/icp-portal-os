import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import NotesLib "../lib/notes";
import Types "../types/notes";

mixin (
  accessControlState : AccessControl.AccessControlState,
  states : Map.Map<Principal, NotesLib.State>,
) {
  /// Reject anonymous callers and return the caller's own notes state,
  /// creating it on first use. Every endpoint is per-principal: a caller only
  /// ever reads or writes its own state.
  func notesCallerState(caller : Principal) : NotesLib.State {
    if (caller.isAnonymous()) {
      Runtime.trap("Sign in required");
    };
    switch (states.get(caller)) {
      case (?state) { state };
      case null {
        let state = NotesLib.initState();
        states.add(caller, state);
        state;
      };
    };
  };

  /// Read-only counterpart of `notesCallerState`: reject anonymous callers and
  /// return the caller's own state, or `null` when the caller has none yet.
  func notesCallerStateOpt(caller : Principal) : ?NotesLib.State {
    if (caller.isAnonymous()) {
      Runtime.trap("Sign in required");
    };
    states.get(caller);
  };

  public shared ({ caller }) func createNote(title : Text, body : Text, folderId : ?Nat) : async Types.Note {
    NotesLib.createNote(notesCallerState(caller), title, body, folderId);
  };

  public query ({ caller }) func getNote(id : Nat) : async ?Types.Note {
    switch (notesCallerStateOpt(caller)) {
      case (?state) { NotesLib.getNote(state, id) };
      case null { null };
    };
  };

  public shared ({ caller }) func updateNote(id : Nat, title : Text, body : Text, folderId : ?Nat) : async ?Types.Note {
    NotesLib.updateNote(notesCallerState(caller), id, title, body, folderId);
  };

  public shared ({ caller }) func setNotePinned(id : Nat, pinned : Bool) : async ?Types.Note {
    NotesLib.setPinned(notesCallerState(caller), id, pinned);
  };

  public shared ({ caller }) func addNoteAttachment(id : Nat, ref : Types.FileRef) : async ?Types.Note {
    NotesLib.addAttachment(notesCallerState(caller), id, ref);
  };

  public shared ({ caller }) func removeNoteAttachment(id : Nat, index : Nat) : async ?Types.Note {
    NotesLib.removeAttachment(notesCallerState(caller), id, index);
  };

  public shared ({ caller }) func deleteNote(id : Nat) : async Bool {
    NotesLib.deleteNote(notesCallerState(caller), id);
  };

  public query ({ caller }) func listNotes(folderId : ?Nat) : async [Types.Note] {
    switch (notesCallerStateOpt(caller)) {
      case (?state) { NotesLib.listNotes(state, folderId) };
      case null { [] };
    };
  };

  public query ({ caller }) func searchNotes(term : Text) : async [Types.Note] {
    switch (notesCallerStateOpt(caller)) {
      case (?state) { NotesLib.searchNotes(state, term) };
      case null { [] };
    };
  };

  public shared ({ caller }) func createNoteFolder(name : Text) : async Types.NoteFolder {
    NotesLib.createFolder(notesCallerState(caller), name);
  };

  public shared ({ caller }) func renameNoteFolder(id : Nat, name : Text) : async ?Types.NoteFolder {
    NotesLib.renameFolder(notesCallerState(caller), id, name);
  };

  public shared ({ caller }) func deleteNoteFolder(id : Nat) : async Bool {
    NotesLib.deleteFolder(notesCallerState(caller), id);
  };

  public query ({ caller }) func listNoteFolders() : async [Types.NoteFolder] {
    switch (notesCallerStateOpt(caller)) {
      case (?state) { NotesLib.listFolders(state) };
      case null { [] };
    };
  };
};
