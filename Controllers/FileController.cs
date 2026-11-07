using Microsoft.AspNetCore.Mvc;
using TestProject.src.Application.Interfaces;

namespace TestProject.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FileController : ControllerBase
    {
        private readonly IFileUploadDownload _fileService;
        private readonly ILogger<SettingsController> _logger;

        public FileController(IFileUploadDownload fileService, ILogger<SettingsController> logger)
        {
            _fileService = fileService;
            _logger = logger;
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

        [HttpGet("download")]
        public async Task<IActionResult> DownloadFileAsync(string path)
        {
            try
            {
                var fileInfo = await _fileService.DownloadSingleFile(path);
                return File(fileInfo.FileStream, fileInfo.ContentType, fileInfo.FileName);
            }
            catch (FileNotFoundException fnf)
            {
                return NotFound(fnf.Message);
            }
            catch (UnauthorizedAccessException ex) // Path outside the home directory
            {
                _logger.LogWarning(ex, "Rejected download of path {Path}", path);
                return StatusCode(StatusCodes.Status403Forbidden, "Path is outside the home directory.");
            }
        }

        [HttpGet("download-multi")]
        public async Task<IActionResult> DownloadMultiFilesZipAsync([FromQuery] List<string> files)
        {
            try
            {
                var memoryStream = await _fileService.DownloadFilesAsZip(files);

                return File(memoryStream, "application/zip", $"Downloads-{DateTime.Now:yyyyMMdd}.zip");
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (FileNotFoundException fnf)
            {
                return NotFound(fnf.Message);
            }
            catch (UnauthorizedAccessException ex) // A path is outside the home directory
            {
                _logger.LogWarning(ex, "Rejected zip download of paths {Paths}", files);
                return StatusCode(StatusCodes.Status403Forbidden, "A path is outside the home directory.");
            }
        }

        [HttpDelete]
        public async Task<IActionResult> DeleteFiles([FromQuery] List<string> files)
        {
            try
            {
                var fileCount = files.Count();

                await _fileService.Delete(files);

                return Ok(fileCount);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (FileNotFoundException fnf)
            {
                _logger.LogError(fnf, "One or more files were not deleted");
                return NotFound(fnf.Message);
            }
            catch (UnauthorizedAccessException ex) // A path is outside the home directory
            {
                _logger.LogError(ex, "One or more files were not deleted");
                return StatusCode(StatusCodes.Status403Forbidden, "A path is outside the home directory.");
            }
        }
    }
}
