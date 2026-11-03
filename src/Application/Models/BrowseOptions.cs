namespace TestProject.src.Application.Models
{
    public class BrowseOptions
    {
        /// <summary>
        /// Set options for file browsing in configuration
        /// </summary>
        public const string SectionName = "BrowseOptions";

        /// <summary>
        /// Get or set the server-side home directory exposed by the API.
        /// </summary>
        public string HomeDirectory { get; set; } = "";
    }
}
