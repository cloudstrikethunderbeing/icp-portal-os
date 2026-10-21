import Common "common";

module {
  public type Id = Common.Id;
  public type Timestamp = Common.Timestamp;
  public type StorageSection = Common.StorageSection;
  public type FileRef = Common.FileRef;
  public type WorkspaceError = Common.WorkspaceError;

  /// A folder in the user's file workspace.
  public type Folder = {
    id : Id;
    name : Text;
    parentId : ?Id;
    section : StorageSection;
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };

  /// A file entry in the user's file workspace.
  public type FileEntry = {
    id : Id;
    name : Text;
    parentId : ?Id;
    section : StorageSection;
    ref : FileRef;
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };

  /// Sort key for listing files and folders.
  public type SortKey = {
    #name;
    #createdAt;
    #updatedAt;
    #size;
  };

  public type SortOrder = {
    #asc;
    #desc;
  };

  /// A combined listing row for a folder view.
  public type ListingItem = {
    #folder : Folder;
    #file : FileEntry;
  };
};
