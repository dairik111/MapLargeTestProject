using Microsoft.Extensions.Options;
using TestProject.Application.Models;
using TestProject.src.Application.Interfaces;
using TestProject.src.Application.Models;

namespace TestProject.src.Application.Services
{
    public class DirectorySearchService : IDirectorySearchService
    {
        private readonly ISettingsHelper _settingsHelpers;

        public DirectorySearchService(ISettingsHelper settingsHelpers)
        {
            _settingsHelpers = settingsHelpers;
        }

        public DirectoryListing DirectoryContentList(string? relativePath)
        {
            var full = _settingsHelpers.Resolve(relativePath);
            if (!Directory.Exists(full)) 
                throw new DirectoryNotFoundException();

            var entries = new DirectoryInfo(full)
                .EnumerateFileSystemInfos()
                .Where(IsVisible)
                .Select(ToEntry)
                .OrderByDescending(e => e.IsDirectory)
                .ThenBy(e => e.Name, StringComparer.OrdinalIgnoreCase)
                .ToList();

            var rel = _settingsHelpers.ToRelative(full);
            return new DirectoryListing(rel, ParentOf(rel), entries, _settingsHelpers.CurrentRoot);
        }

        public SearchResult Search(string query, string? relativePath, int maxResults)
        {
            var fullPath = _settingsHelpers.Resolve(relativePath);

            if (!Directory.Exists(fullPath)) 
                throw new DirectoryNotFoundException();

            var options = new EnumerationOptions
            {
                RecurseSubdirectories = true,
                IgnoreInaccessible = true,
                AttributesToSkip = FileAttributes.System | FileAttributes.ReparsePoint,
                MatchCasing = MatchCasing.CaseInsensitive
            };

            var results = new List<FileEntry>();
            var truncated = false;
            foreach (var info in new DirectoryInfo(fullPath).EnumerateFileSystemInfos("*", options))
            {
                if (!info.Name.Contains(query, StringComparison.OrdinalIgnoreCase)) continue;
                if (results.Count >= maxResults) { truncated = true; break; }
                results.Add(ToEntry(info));
            }
            return new SearchResult(query, truncated, results);
        }

        #region Helpers

        private static bool IsVisible(FileSystemInfo i)
        {
             return !i.Attributes.HasFlag(FileAttributes.System) && !i.Attributes.HasFlag(FileAttributes.ReparsePoint);
        }

        private static string? ParentOf(string relPath)
        {
            if (relPath.Length == 0) 
                return null;

            var idx = relPath.LastIndexOf('/');

            return idx < 0 ? "" : relPath[..idx];
        }

        private FileEntry ToEntry(FileSystemInfo fsi)
        {
            var isDir = fsi is DirectoryInfo;

            return new FileEntry(fsi.Name, _settingsHelpers.ToRelative(fsi.FullName), isDir,
                isDir ? null :  ((FileInfo)fsi).Length, fsi.LastWriteTimeUtc);
        }
        #endregion
    }
}
