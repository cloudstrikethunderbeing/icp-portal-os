import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import Types "../types/notes";

module {
  public type Note = Types.Note;
  public type NoteFolder = Types.NoteFolder;
  public type WorkspaceError = Types.WorkspaceError;

  /// Per-principal notes state.
  public type State = {
    notes : Map.Map<Nat, Note>;
    folders : Map.Map<Nat, NoteFolder>;
    var nextNoteId : Nat;
    var nextFolderId : Nat;
  };

  public func initState() : State {
    {
      notes = Map.empty();
      folders = Map.empty();
      var nextNoteId = 0;
      var nextFolderId = 0;
    };
  };

  public func createNote(state : State, title : Text, body : Text, folderId : ?Nat) : Note {
    let now = Time.now();
    let id = state.nextNoteId;
    state.nextNoteId := id + 1;
    let note : Note = {
      id;
      title;
      body;
      folderId;
      pinned = false;
      attachments = [];
      createdAt = now;
      updatedAt = now;
    };
    state.notes.add(id, note);
    note;
  };

  public func getNote(state : State, id : Nat) : ?Note {
    state.notes.get(id);
  };

  public func updateNote(state : State, id : Nat, title : Text, body : Text, folderId : ?Nat) : ?Note {
    switch (state.notes.get(id)) {
      case null { null };
      case (?note) {
        let updated : Note = { note with title; body; folderId; updatedAt = Time.now() };
        state.notes.add(id, updated);
        ?updated;
      };
    };
  };

  public func setPinned(state : State, id : Nat, pinned : Bool) : ?Note {
    switch (state.notes.get(id)) {
      case null { null };
      case (?note) {
        let updated : Note = { note with pinned; updatedAt = Time.now() };
        state.notes.add(id, updated);
        ?updated;
      };
    };
  };

  public func addAttachment(state : State, id : Nat, ref : Types.FileRef) : ?Note {
    switch (state.notes.get(id)) {
      case null { null };
      case (?note) {
        let updated : Note = {
          note with
          attachments = note.attachments.concat([ref]);
          updatedAt = Time.now();
        };
        state.notes.add(id, updated);
        ?updated;
      };
    };
  };

  public func removeAttachment(state : State, id : Nat, index : Nat) : ?Note {
    switch (state.notes.get(id)) {
      case null { null };
      case (?note) {
        if (index >= note.attachments.size()) { return null };
        let kept = List.empty<Types.FileRef>();
        var i = 0;
        for (ref in note.attachments.values()) {
          if (i != index) { kept.add(ref) };
          i += 1;
        };
        let updated : Note = { note with attachments = kept.toArray(); updatedAt = Time.now() };
        state.notes.add(id, updated);
        ?updated;
      };
    };
  };

  public func deleteNote(state : State, id : Nat) : Bool {
    switch (state.notes.get(id)) {
      case null { false };
      case (?_) { ignore state.notes.remove(id); true };
    };
  };

  public func listNotes(state : State, folderId : ?Nat) : [Note] {
    let items = List.empty<Note>();
    for (note in state.notes.values()) {
      if (note.folderId == folderId) { items.add(note) };
    };
    items.toArray();
  };

  public func searchNotes(state : State, term : Text) : [Note] {
    let needle = term.toLower();
    let items = List.empty<Note>();
    for (note in state.notes.values()) {
      if (note.title.toLower().contains(#text needle) or note.body.toLower().contains(#text needle)) {
        items.add(note);
      };
    };
    items.toArray();
  };

  public func createFolder(state : State, name : Text) : NoteFolder {
    let now = Time.now();
    let id = state.nextFolderId;
    state.nextFolderId := id + 1;
    let folder : NoteFolder = { id; name; createdAt = now; updatedAt = now };
    state.folders.add(id, folder);
    folder;
  };

  public func renameFolder(state : State, id : Nat, name : Text) : ?NoteFolder {
    switch (state.folders.get(id)) {
      case null { null };
      case (?folder) {
        let updated : NoteFolder = { folder with name; updatedAt = Time.now() };
        state.folders.add(id, updated);
        ?updated;
      };
    };
  };

  /// Delete a note folder; notes assigned to it become unfiled.
  public func deleteFolder(state : State, id : Nat) : Bool {
    switch (state.folders.get(id)) {
      case null { false };
      case (?_) {
        // Collect affected notes first, then update — mutating a Map while
        // iterating it is unsafe.
        let affected = List.empty<Nat>();
        for ((noteId, note) in state.notes.entries()) {
          if (note.folderId == ?id) { affected.add(noteId) };
        };
        for (noteId in affected.values()) {
          switch (state.notes.get(noteId)) {
            case (?note) { state.notes.add(noteId, { note with folderId = null; updatedAt = Time.now() }) };
            case null {};
          };
        };
        ignore state.folders.remove(id);
        true;
      };
    };
  };

  public func listFolders(state : State) : [NoteFolder] {
    state.folders.values().toArray();
  };
};
