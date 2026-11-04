# File Browser Highlights

A summary of the features in the File Browser project: an ASP.NET Core (net10.0) backend with a plain HTML, CSS and TypeScript front end.

## Browsing and search

- **Directory listing.** `GET /api/search?path=` lists the contents of a folder, with the path relative to the home directory. Each listing returns the normalized path, a parent path (for the `..` row) and the entries.
- **Recursive search.** `GET /api/search/search?query=&path=&max=` searches file and folder names under a folder. The result count is clamped to 1-1000, and the response reports when results were truncated.
- **Error handling.** Invalid or out-of-root paths return 400, and missing folders return 404.
- **Path safety.** Every client-supplied path is resolved against the home directory, and anything that escapes it is rejected.

## Home directory

- **Changing the home.** `POST /api/filemanager/sethome` sets a new home directory. It validates the path, then redirects to the directory listing, so the client receives the new home's contents.
- **Reading the home.** `GET /api/filemanager` returns the current home.
- **Shared state.** The home is held by the settings helper, so the change applies to subsequent requests. It is server-wide, not per user.
- **Service layer.** `SettingsService` and `DirectorySearchService` handle the logic behind the controllers, wired up through dependency injection.

## Deep links

- **URL scheme.** The current folder is stored in the query string, for example `/?path=docs/reports`. Opening or reloading such a URL loads that folder.
- **History.** Navigating to a folder pushes a history entry, but only after the load succeeds and only when the folder actually changed. Initial loads and Back/Forward never push.
- **Back and Forward.** A `popstate` handler reloads the listing for the URL's path.
- **Failed loads.** If a deep link or Back/Forward points at a folder that no longer exists, the page shows the requested path in the breadcrumbs, an empty table and the error. You can click up from there.

## Front-end behavior

- **Breadcrumbs** let you jump to any parent folder, and the table has a `..` row.
- **Search form** searches from the current folder. An empty search or Clear reloads the folder.
- **Out-of-order protection.** A shared request counter makes directory loads, searches and home changes ignore responses from older requests, so fast clicking can't show stale results.
- **Error reporting.** The POST helper checks the response status and shows the server's message, the same as the GET helper.
- **After changing home.** The listing, breadcrumbs and `currentPath` are updated, the search box is cleared, and the URL is reset to the root without adding a history entry.

## Layout

- **Two columns.** The directory table is on the left. A Settings column on the right holds the "Home Directory" heading and the home path form.
- **Responsive.** Below 800px wide, the Settings column moves under the table.

## Project structure

| Path | Purpose |
| --- | --- |
| `Controllers/SearchController.cs` | Directory listing and search endpoints |
| `Controllers/FileManagerController.cs` | Get and set the home directory |
| `src/Application/` | Interfaces, models and services |
| `scripts/app.ts` | Front-end source (TypeScript) |
| `wwwroot/js/app.js` | Compiled output of `app.ts`; don't edit it directly |
| `wwwroot/index.html`, `wwwroot/css/styles.css` | Page and styles |

## Notes and known limitations

- `tsconfig.json` has `noEmitOnError: true`. If `app.ts` has a compile error, `app.js` is not regenerated and the old script keeps running.
- Static assets have no cache-busting, so after changes you may need a hard refresh.
- Because the home directory is global, deep links are relative to it. They point to different folders if the home is changed.
- `sethome` lets a client set the home to any existing directory on the server. Restrict it if the app is exposed beyond trusted users.
- `SearchSettingsController` duplicates `sethome` and can be removed.
