# Library Book Tracking v1 workflow

## Purpose

Let a user keep a personal list of book editions or formats and track whether each entry is planned, in progress, or finished.

## Audience

- V1 is a single-user personal local app; multi-user libraries are out of scope.
- V1 is browser-based.
- The browser UI adapts to desktop and phone screen sizes, but the local service only needs to run on the user's computer; connecting from a separate phone is out of scope.
- The user's library is used on one device in v1; cross-device access and synchronization are out of scope.
- The Go API stores the library and keeps it available after the app is closed and reopened.
- V1 does not synchronize the library across devices; users can move a copy with CSV export and import.
- V1 does not show a separate notice about local data storage or device-data loss.
- The app runs locally and works without internet while its local service is running.
- V1 is not hosted or deployed. Hosting will be considered with v2 authentication.

## Book record

- A Book represents an edition or format of a work in a user's personal reading library, not an owned physical copy.
- Title is required.
- Author and ISBN are optional. Users can enter an ISBN manually; when provided, it must be a valid ISBN-10 or ISBN-13, including its check digit. Spaces and hyphens are ignored during validation.
- An invalid or already-used ISBN prevents saving and is reported at the ISBN field.
- V1 stores text details only; users cannot add a cover image.
- ISBN lookup and barcode scanning are out of scope for v1 and planned for v2.
- A user may save multiple Book records with the same title and author; v1 does not detect or prevent duplicates.
- A reread of the same edition or format uses the existing Book record rather than creating a separate record for that reading.
- An ISBN may appear on only one Book in a user's library. Duplicate checking ignores spaces and hyphens and treats an ISBN-10 as the same identifier as its equivalent 978 ISBN-13.

## Reading status

- Every Book has one of three statuses: To read, Currently reading, or Completed.
- A new Book defaults to To read. During entry, the user may select a different status before saving.
- Users may change a Book directly to any status at any time.
- Users may have multiple Books marked Currently reading at once.
- To reread a Completed Book, the user reopens the same Book by changing its status to Currently reading. V1 does not keep a separate record of each reading.
- V1 tracks status only. It does not track page numbers, percentages, or other reading progress.

## Browse the library

- The library is organized into three separate views: To read, Currently reading, and Completed.
- An empty status view shows a brief message and an Add Book action.
- The library opens on Currently reading by default.
- Books in each view are ordered by most recently added first.
- Users can search the entire library by title and author, across all three statuses. Search is partial and case-insensitive.
- Search results show each Book's status.
- Each list row shows the Book's title and, when present, its author. ISBN stays in the Book details.
- Users can change a Book's status directly from its list row.

## Add a Book

1. The user enters a title.
2. The user may enter an author and ISBN.
3. The status starts as To read; the user may choose Currently reading or Completed instead.
4. The user saves the Book to their personal library; the app opens the view for the chosen status.

## Edit a Book

- Users may edit a saved Book's title, author, and ISBN at any time.

## Remove a Book

- Users may permanently delete a Book from their personal library.
- The app asks for confirmation before deleting a Book.
- V1 does not provide an archive for removed Books.

## Feedback

- Successful add, edit, status change, delete, CSV import, and CSV export actions show a brief toast confirmation.
- Book field validation errors appear beside the field; CSV import errors identify the row and reason.

## Export the library

- Users can export their personal library as a CSV file that includes a stable identifier for each Book.
- Users can import a CSV previously exported by this app, merging its Books into the current library by stable identifier. Matching identifiers update the existing Book.
- Import applies the same title, status, and ISBN validation as manual entry. Any invalid row or ISBN conflict rejects the entire file without changing the library; the error identifies the row and reason.
- Before applying a valid import, the app previews each Book to add or update and asks the user to confirm.

## Out of scope for v1

- ISBN-based metadata lookup and barcode scanning.
- User-supplied book cover images.
- Cross-device synchronization and external storage; revisit alongside planned v2 authentication.
- Authentication and hosting, planned for consideration in v2.
- Physical-copy inventory, lending, or stock tracking.
- Separate reading records or reading history for rereads.
- Page or percentage progress tracking.
