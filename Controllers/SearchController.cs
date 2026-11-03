using Microsoft.AspNetCore.Mvc;
using TestProject.src.Application.Interfaces;

namespace TestProject.Controllers {
    [ApiController]    
    [Route("api/[controller]")]
    public class SearchController : ControllerBase {

        private readonly ILogger<SearchController> _logger;

        private readonly IDirectorySearchService _files;

        public SearchController(ILogger<SearchController> logger, IDirectorySearchService files)
        {
            _logger = logger;
            _files = files;
        }

        #region Actions

        /// List the contents of a directory (relative to the home directory)
        [HttpGet]
        public IActionResult DirectoryContentList([FromQuery] string? path) =>
            Run(() => _files.DirectoryContentList(path));

        /// Recursively search file and folder names under a directory
        [HttpGet("search")]
        public IActionResult Search([FromQuery] string query, [FromQuery] string? path, [FromQuery] int max = 200)
        {
            if (string.IsNullOrWhiteSpace(query)) 
                return BadRequest("Query is required.");

            max = Math.Clamp(max, 1, 1000);

            return Run(() => _files.Search(query.Trim(), path, max));
        }
        #endregion

        #region Helpers

        //Execute all actions here to manage exceptions
        private IActionResult Run<T>(Func<T> action)
        {
            try { return Ok(action()); }
            catch (UnauthorizedAccessException) { return BadRequest("Invalid path."); }
            catch (DirectoryNotFoundException) { return NotFound("Directory not found."); }
        }

        #endregion

    }
}