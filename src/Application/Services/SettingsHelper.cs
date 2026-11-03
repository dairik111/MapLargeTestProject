using Microsoft.Extensions.Options;
using TestProject.src.Application.Interfaces;
using TestProject.src.Application.Models;

namespace TestProject.src.Application.Services
{
    internal class SettingsHelper : ISettingsHelper
    {
        private volatile string _rootDirectory;
        private readonly IOptions<BrowseOptions> _options;

        public SettingsHelper(IOptions<BrowseOptions> options, IWebHostEnvironment env)
        {
            _options = options;
            var home = options.Value.HomeDirectory;

            //If home is not specified in appsettings, just append FileRoot as a default
            if (string.IsNullOrWhiteSpace(home))
                home = Path.Combine(env.ContentRootPath, "FileRoot");

            _rootDirectory = Path.TrimEndingDirectorySeparator(Path.GetFullPath(home));
            Directory.CreateDirectory(_rootDirectory);
        }

        public string CurrentRoot
        {
            get { return _rootDirectory; }
            set
            {
                var full = Path.TrimEndingDirectorySeparator(Path.GetFullPath(value));
                if (!Directory.Exists(full)) throw new DirectoryNotFoundException();
                _rootDirectory = full;
            }
        }

        /// <summary>Maps a client-supplied relative path to a full path, rejecting anything outside the root.</summary>
        string ISettingsHelper.Resolve(string? relativePath)
        {
            var relPath = (relativePath ?? "").Replace('/', Path.DirectorySeparatorChar).TrimStart(Path.DirectorySeparatorChar);
            var fullPath = Path.GetFullPath(Path.Combine(_rootDirectory, relPath));
            var compare = OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
            var inside = fullPath.Equals(_rootDirectory, compare) || fullPath.StartsWith(_rootDirectory + Path.DirectorySeparatorChar, compare);

            if (!inside)
                throw new UnauthorizedAccessException("Path is outside the home directory.");

            return fullPath;
        }

        string ISettingsHelper.ToRelative(string full)
        {
            return Path.GetRelativePath(_rootDirectory, full).Replace('\\', '/') is var relPath && relPath == "." ? "" : relPath;
        }
    }
}
