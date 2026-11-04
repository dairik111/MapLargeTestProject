namespace TestProject.Application.Models
{
        public record FileEntry(string Name, string Path, bool IsDirectory, long? Size, DateTime Modified);

        public record DirectoryListing(string Path, string? Parent, IReadOnlyList<FileEntry> Entries, string HomePath);

        public record SearchResult(string Query, bool Truncated, IReadOnlyList<FileEntry> Entries);
    
}
