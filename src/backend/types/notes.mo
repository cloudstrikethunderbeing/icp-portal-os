import Common "common";

module {
  public type Id = Common.Id;
  public type Timestamp = Common.Timestamp;
  public type FileRef = Common.FileRef;
  public type WorkspaceError = Common.WorkspaceError;

  /// A note folder.
  public type NoteFolder = {
    id : Id;
    name : Text;
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };

  /// A note with a rich-text body and optional folder assignment.
  public type Note = {
    id : Id;
    title : Text;
    body : Text;
    folderId : ?Id;
    pinned : Bool;
    attachments : [FileRef];
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };
};
