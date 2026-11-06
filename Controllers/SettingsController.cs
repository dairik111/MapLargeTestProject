using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using TestProject.src.Application.Interfaces;
using TestProject.src.Application.Models;

namespace TestProject.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SettingsController : ControllerBase
    {

        private readonly ISettingsService _settingsService;
        private readonly IFileUploadDownload _fileService;

        public SettingsController(ISettingsService settingsService, IFileUploadDownload fileService)
        {
            _settingsService = settingsService;
            _fileService = fileService;
        }

        // GET: api/settings
        [HttpGet]
        public IActionResult Get()
        {
            return  Ok(_settingsService.GetHome());
        }

        // GET: api/settings/statustimeout
        [HttpGet("statustimeout")]
        public IActionResult GetStatusTimeout([FromServices] IOptions<BrowseOptions> options)
        {
            return Ok(new { seconds = Math.Max(0, options.Value.StatusTimeout) });
        }

        // POST api/sethome
        [HttpPost("sethome")]
        public IActionResult Post([FromBody] string value)
        {
            string newPath = string.Empty;

            try { 
               newPath = _settingsService.SetHome(value); 
            }
            catch (ArgumentException) { return BadRequest("Path is required."); }
            catch (DirectoryNotFoundException) { return NotFound("Directory not found."); }

            return RedirectToAction(nameof(SearchController.DirectoryContentList), "Search");
        }
    }
}
