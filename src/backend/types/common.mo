import Storage "mo:caffeineai-object-storage/Storage";

module {
  /// A user identity — the caller's Internet Identity principal.
  public type UserId = Principal;

  /// Signed nanosecond timestamp (Time.now()).
  public type Timestamp = Int;

  /// Monotonic per-principal identifier for records.
  public type Id = Nat;

  /// Which storage section a file or folder belongs to.
  public type StorageSection = {
    #local;
    #icpCloud;
  };

  /// A reference to an uploaded file held in off-chain object storage.
  public type FileRef = {
    blob : Storage.ExternalBlob;
    filename : Text;
    mimeType : ?Text;
    sizeBytes : ?Nat;
  };

  /// Explicit error variants shared across domains.
  public type WorkspaceError = {
    #notFound;
    #notAuthorized;
    #invalidInput : Text;
  };
};
