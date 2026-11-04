using Microsoft.AspNetCore.Mvc;
using System.Runtime;
using TestProject.src.Application.Interfaces;
using static System.Net.WebRequestMethods;

namespace TestProject.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FileManagerController : ControllerBase
    {

        private readonly ISettingsService _settingsService;

        public FileManagerController(ISettingsService settingsService)
        {
            _settingsService = settingsService;
        }

        // GET: api/<FileManagerController>
        [HttpGet]
        public IActionResult Get()
        {
            return  Ok(_settingsService.GetHome());
        }

        // POST api/<FileManagerController>
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
