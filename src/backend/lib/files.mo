import Map "mo:core/Map";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Types "../types/files";

module {
  public type Folder = Types.Folder;
  public type FileEntry = Types.FileEntry;
  public type ListingItem = Types.ListingItem;
  public type SortKey = Types.SortKey;
  public type SortOrder = Types.SortOrder;
  public type WorkspaceError = Types.WorkspaceError;

  /// Per-principal file workspace state.
  public type State = {
    folders : Map.Map<Nat, Folder>;
    files : Map.Map<Nat, FileEntry>;
    var nextFolderId : Nat;
    var nextFileId : Nat;
  };

  public func initState() : State {
    {
      folders = Map.empty();
      files = Map.empty();
      var nextFolderId = 0;
      var nextFileId = 0;
    };
  };

  /// Whether `candidate` is `id` itself or a descendant of `id`, walking up the
  /// folder chain. Used to reject moving a folder into its own subtree.
  func isDescendant(folders : Map.Map<Nat, Folder>, candidate : Nat, id : Nat) : Bool {
    var current : ?Nat = ?candidate;
    var guard = 0;
    while (guard < 10_000) {
      switch (current) {
        case null { return false };
        case (?cid) {
          if (cid == id) { return true };
          switch (folders.get(cid)) {
            case (?f) { current := f.parentId };
            case null { return false };
          };
        };
      };
      guard += 1;
    };
    false;
  };

  public func createFolder(state : State, name : Text, parentId : ?Nat, section : Types.StorageSection) : Folder {
    let now = Time.now();
    let id = state.nextFolderId;
    state.nextFolderId := id + 1;
    let folder : Folder = {
      id;
      name;
      parentId;
      section;
      createdAt = now;
      updatedAt = now;
    };
    state.folders.add(id, folder);
    folder;
  };

  public func renameFolder(state : State, id : Nat, name : Text) : ?Folder {
    switch (state.folders.get(id)) {
      case null { null };
      case (?folder) {
        let updated : Folder = { folder with name; updatedAt = Time.now() };
        state.folders.add(id, updated);
        ?updated;
      };
    };
  };

  public func moveFolder(state : State, id : Nat, parentId : ?Nat) : ?Folder {
    switch (state.folders.get(id)) {
      case null { null };
      case (?folder) {
        // Refuse to move a folder into itself or one of its own descendants.
        switch (parentId) {
          case (?p) { if (isDescendant(state.folders, p, id)) { return null } };
          case null {};
        };
        let updated : Folder = { folder with parentId; updatedAt = Time.now() };
        state.folders.add(id, updated);
        ?updated;
      };
    };
  };

  /// Delete a folder and everything beneath it (subfolders and files).
  public func deleteFolder(state : State, id : Nat) : Bool {
    switch (state.folders.get(id)) {
      case null { false };
      case (?_) {
        // Collect the subtree of folder ids rooted at `id`.
        let doomed = List.empty<Nat>();
        doomed.add(id);
        var changed = true;
        while (changed) {
          changed := false;
          for ((fid, folder) in state.folders.entries()) {
            switch (folder.parentId) {
              case (?p) {
                if (doomed.contains(p) and not doomed.contains(fid)) {
                  doomed.add(fid);
                  changed := true;
                };
              };
              case null {};
            };
          };
        };
        // Remove files whose parent is in the doomed set. Collect first, then
        // remove — mutating a Map while iterating it is unsafe.
        let doomedFiles = List.empty<Nat>();
        for ((fileId, file) in state.files.entries()) {
          switch (file.parentId) {
            case (?p) { if (doomed.contains(p)) { doomedFiles.add(fileId) } };
            case null {};
          };
        };
        for (fileId in doomedFiles.values()) { ignore state.files.remove(fileId) };
        for (fid in doomed.values()) { ignore state.folders.remove(fid) };
        true;
      };
    };
  };

  public func addFile(state : State, name : Text, parentId : ?Nat, section : Types.StorageSection, ref : Types.FileRef) : FileEntry {
    let now = Time.now();
    let id = state.nextFileId;
    state.nextFileId := id + 1;
    let entry : FileEntry = {
      id;
      name;
      parentId;
      section;
      ref;
      createdAt = now;
      updatedAt = now;
    };
    state.files.add(id, entry);
    entry;
  };

  public func renameFile(state : State, id : Nat, name : Text) : ?FileEntry {
    switch (state.files.get(id)) {
      case null { null };
      case (?file) {
        let updated : FileEntry = { file with name; updatedAt = Time.now() };
        state.files.add(id, updated);
        ?updated;
      };
    };
  };

  public func moveFile(state : State, id : Nat, parentId : ?Nat) : ?FileEntry {
    switch (state.files.get(id)) {
      case null { null };
      case (?file) {
        let updated : FileEntry = { file with parentId; updatedAt = Time.now() };
        state.files.add(id, updated);
        ?updated;
      };
    };
  };

  public func copyFile(state : State, id : Nat, parentId : ?Nat) : ?FileEntry {
    switch (state.files.get(id)) {
      case null { null };
      case (?file) {
        let now = Time.now();
        let newId = state.nextFileId;
        state.nextFileId := newId + 1;
        let copy : FileEntry = {
          id = newId;
          name = file.name;
          parentId;
          section = file.section;
          ref = file.ref;
          createdAt = now;
          updatedAt = now;
        };
        state.files.add(newId, copy);
        ?copy;
      };
    };
  };

  public func deleteFile(state : State, id : Nat) : Bool {
    switch (state.files.get(id)) {
      case null { false };
      case (?_) { ignore state.files.remove(id); true };
    };
  };

  public func listFolder(state : State, parentId : ?Nat, section : Types.StorageSection) : [ListingItem] {
    let items = List.empty<ListingItem>();
    for (folder in state.folders.values()) {
      if (folder.parentId == parentId and folder.section == section) {
        items.add(#folder(folder));
      };
    };
    for (file in state.files.values()) {
      if (file.parentId == parentId and file.section == section) {
        items.add(#file(file));
      };
    };
    items.toArray();
  };

  public func search(state : State, term : Text) : [ListingItem] {
    let needle = term.toLower();
    let items = List.empty<ListingItem>();
    for (folder in state.folders.values()) {
      if (folder.name.toLower().contains(#text needle)) {
        items.add(#folder(folder));
      };
    };
    for (file in state.files.values()) {
      if (file.name.toLower().contains(#text needle)) {
        items.add(#file(file));
      };
    };
    items.toArray();
  };

  func itemName(item : ListingItem) : Text {
    switch (item) {
      case (#folder(f)) { f.name };
      case (#file(f)) { f.name };
    };
  };

  func itemCreatedAt(item : ListingItem) : Int {
    switch (item) {
      case (#folder(f)) { f.createdAt };
      case (#file(f)) { f.createdAt };
    };
  };

  func itemUpdatedAt(item : ListingItem) : Int {
    switch (item) {
      case (#folder(f)) { f.updatedAt };
      case (#file(f)) { f.updatedAt };
    };
  };

  func itemSize(item : ListingItem) : Nat {
    switch (item) {
      case (#folder(_)) { 0 };
      case (#file(f)) { f.ref.sizeBytes ?? 0 };
    };
  };

  public func sortItems(items : [ListingItem], key : SortKey, order : SortOrder) : [ListingItem] {
    items.sort(func (a, b) {
      let cmp : Order.Order = switch (key) {
        case (#name) { itemName(a).compare(itemName(b)) };
        case (#createdAt) { Int.compare(itemCreatedAt(a), itemCreatedAt(b)) };
        case (#updatedAt) { Int.compare(itemUpdatedAt(a), itemUpdatedAt(b)) };
        case (#size) { Nat.compare(itemSize(a), itemSize(b)) };
      };
      switch (order) {
        case (#asc) { cmp };
        case (#desc) {
          switch (cmp) {
            case (#less) { #greater };
            case (#greater) { #less };
            case (#equal) { #equal };
          };
        };
      };
    });
  };
};
