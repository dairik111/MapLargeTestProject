using TestProject.Application.Models;

namespace TestProject.src.Application.Interfaces
{
    public interface IDirectorySearchService
    {
        /// <exception cref="UnauthorizedAccessException">Path escapes the home directory.</exception>
        /// <exception cref="DirectoryNotFoundException">Directory does not exist.</exception>
        DirectoryListing DirectoryContentList(string? relativePath);

        SearchResult Search(string query, string? relativePath, int maxResults);
    }
}
