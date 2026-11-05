using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using TestProject.src.Application.Interfaces;

namespace TestProject.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FileManagerController : ControllerBase
    {

        private readonly ISettingsService _settingsService;
        private readonly IFileUploadDownload _fileService;
        private readonly ILogger<FileManagerController> _logger;

        public FileManagerController(ISettingsService settingsService, IFileUploadDownload fileService, ILogger<FileManagerController> logger)
        {
            _settingsService = settingsService;
            _fileService = fileService;
            _logger = logger;
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

        [HttpPost("upload")]
        public async Task<IActionResult> Upload(List<IFormFile> files)
        {
            try
            {
                var uploadSize = await _fileService.FileUpload(files);

                return Ok(new { count = files.Count, uploadSize });
            }
            catch (Exception ex) // Don't throw error data to the client
            {
                string err = "An exception occurred while uploading files";
                _logger.LogError(ex, err);

                return BadRequest(err);
            }
           
        }

    }
}
