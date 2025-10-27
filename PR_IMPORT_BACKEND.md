PR: Import local backend and safety fixes

What this PR contains
- Import of local backend files into repository (initial import branch).
- Safety fixes applied post-import:
  - Safe deletion of image files in `controllers/propertyController.js`: derive filename via `path.basename` and call `deleteUploadedFile(filename)` instead of passing full paths.
  - Team member delete fix in `controllers/teamMemberController.js`: replace placeholder path with basename extraction and safe `deleteUploadedFile` call.
  - ImageKit-aware deletion fallback in `middleware/upload.js`: when a file is not found locally and ImageKit is enabled, attempt to delete the remote ImageKit fileId asynchronously (fire-and-forget) to avoid orphaned remote files.

Why
- Prevent accidental path mismatches and ensure deletions work for both local and remote (ImageKit) uploads.
- Make deletion logic robust across uploaded-file shapes (local disk, memory/ImageKit, external URLs).

Testing checklist (manual)
- [ ] Start the backend locally (ensure MONGO_URI is set).
- [ ] Call GET /health and confirm `uploadDir` exists and writable.
- [ ] Create a property with application/json payload (no files) and verify it succeeds.
- [ ] Create a property with multipart/form-data and one or more images (local disk storage). Verify the files appear in `public/uploads` and DB contains image entries with `filename` and `url`.
- [ ] Delete that property and confirm the files are removed from disk.
- [ ] If ImageKit is enabled (set IMAGEKIT_* env vars), upload and then delete images; confirm remote ImageKit resource deletion (check ImageKit console or API).
- [ ] Create and delete a team member with uploaded image and confirm file removal.

Notes and follow-ups
- We attempted a safe non-destructive import; the original .git repository was backed up to `.git.corrupt` in case you need to recover history.
- Consider normalizing the `images` DB shape to include a `provider` field (local|imagekit|external) for clearer delete logic later.

If you'd like I can open a GitHub PR using this branch description, or adjust the tests and add automated integration tests as follow-ups.
